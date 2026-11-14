import { FastifyRequest, FastifyReply } from "fastify";
import bcrypt from "bcryptjs";
import { prisma } from "../services/db.js";
import { verifyEmailExistence } from "../services/emailVerification.js";
import { createNotification } from "../services/notifications.js";
import { checkAndResetAiQuota } from "../services/userQuota.js";

export async function registerUser(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { username, email, password, gender } = request.body as {
    username?: string;
    email?: string;
    password?: string;
    gender?: string;
  };

  if (!username || !email || !password) {
    return reply.status(400).send({
      error: "Bad Request: username, email, and password are required",
    });
  }

  if (password.length < 8) {
    return reply.status(400).send({
      error: "Bad Request: Password must be at least 8 characters long",
    });
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    return reply.status(400).send({
      error: "Bad Request: Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)",
    });
  }

  // Real-time Email Existence & MX DNS Lookup Verification
  const emailVerification = await verifyEmailExistence(email);
  if (!emailVerification.valid) {
    return reply.status(400).send({
      error: "Invalid Email Address",
      message: emailVerification.reason || "The email address provided does not exist or cannot receive mail.",
    });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return reply.status(400).send({
        error: "Conflict: Email address already registered",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        gender: gender || "Prefer not to say",
        plan: "FREE",
        aiGenerationsCount: 0,
        aiGenerationsResetAt: now,
      },
    });

    // Dispatch welcome notification
    createNotification({
      userId: user.id,
      title: "Welcome to JBSnap!",
      message: "Get started by creating your first project and designing visual API workflows.",
      type: "info",
      link: "/dashboard",
    }).catch(() => {});

    return reply.status(201).send({
      message: "User registered successfully",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar || null,
        gender: user.gender,
        plan: user.plan || "FREE",
        aiGenerationsCount: user.aiGenerationsCount || 0,
        aiGenerationsResetAt: user.aiGenerationsResetAt || user.createdAt,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({
      error: "Internal Server Error",
      details: error.message,
    });
  }
}

export async function loginUser(request: FastifyRequest, reply: FastifyReply) {
  const { email, password } = request.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return reply.status(400).send({
      error: "Bad Request: email and password are required",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const rawUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!rawUser || !rawUser.passwordHash) {
      return reply.status(401).send({
        error: "Unauthorized: Invalid email or password",
      });
    }

    const passwordMatch = await bcrypt.compare(password, rawUser.passwordHash);

    if (!passwordMatch) {
      return reply.status(401).send({
        error: "Unauthorized: Invalid email or password",
      });
    }

    // Check and update 30-day AI generation quota cycle (does NOT reset counter on login if within 30 days)
    const user = await checkAndResetAiQuota(rawUser);

    // Sign a JWT token containing user identity details
    const token = await reply.jwtSign({
      id: user.id,
      email: user.email,
    });

    return reply.send({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar || null,
        gender: user.gender || "Prefer not to say",
        plan: user.plan || "FREE",
        aiGenerationsCount: user.aiGenerationsCount || 0,
        aiGenerationsResetAt: user.aiGenerationsResetAt || user.createdAt,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({
      error: "Internal Server Error",
      details: error.message,
    });
  }
}

export async function googleLogin(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as {
    email?: string;
    name?: string;
    picture?: string;
    gender?: string;
    credential?: string;
  };

  let email = body.email ? body.email.trim().toLowerCase() : undefined;
  let name = body.name ? body.name.trim() : undefined;
  let picture = body.picture;
  const gender = body.gender;

  if (body.credential) {
    try {
      const verifyUrl = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(body.credential);
      const verifyRes = await fetch(verifyUrl);
      if (verifyRes.ok) {
        const gUser = (await verifyRes.json()) as any;
        if (gUser.email) {
          email = gUser.email.toLowerCase();
          name = gUser.name || name;
          picture = gUser.picture || picture;
        }
      }
    } catch (err: any) {
      request.log.warn('Google tokeninfo verification failed: ' + (err?.message || err));
    }
  }

  if (!email) {
    return reply.status(400).send({
      error: "Bad Request: email is required for Google login",
    });
  }

  try {
    const now = new Date();
    let rawUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!rawUser) {
      const username = name || email.split("@")[0] || "Google User";
      rawUser = await prisma.user.create({
        data: {
          username,
          email,
          avatar: picture || null,
          passwordHash: null,
          gender: gender || "Prefer not to say",
          plan: "FREE",
          aiGenerationsCount: 0,
          aiGenerationsResetAt: now,
        },
      });
    } else if (!rawUser.avatar && picture) {
      rawUser = await prisma.user.update({
        where: { id: rawUser.id },
        data: { avatar: picture },
      });
    }

    // Check and update 30-day AI generation quota cycle
    const user = await checkAndResetAiQuota(rawUser);

    const token = await reply.jwtSign({
      id: user.id,
      email: user.email,
    });

    return reply.send({
      message: "Google authentication successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar || picture || null,
        gender: user.gender || "Prefer not to say",
        plan: user.plan || "FREE",
        aiGenerationsCount: user.aiGenerationsCount || 0,
        aiGenerationsResetAt: user.aiGenerationsResetAt || user.createdAt,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({
      error: "Internal Server Error",
      details: error.message,
    });
  }
}

export async function getMe(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = (request.user as any).id;
    const rawUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        gender: true,
        plan: true,
        aiGenerationsCount: true,
        aiGenerationsResetAt: true,
        createdAt: true,
      },
    });

    if (!rawUser) {
      return reply.status(404).send({ error: "User not found" });
    }

    // Check 30-day quota cycle on /auth/me call
    const user = await checkAndResetAiQuota(rawUser);

    return reply.send({ user });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({
      error: "Internal Server Error",
      details: error.message,
    });
  }
}

export async function updateProfile(request: FastifyRequest, reply: FastifyReply) {
  const { username, gender, avatar, oldPassword, newPassword } = request.body as {
    username?: string;
    gender?: string;
    avatar?: string | null;
    oldPassword?: string;
    newPassword?: string;
  };

  const userId = (request.user as any).id;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return reply.status(404).send({ error: "User not found" });
    }

    const updateData: any = {};
    if (username !== undefined) updateData.username = username;
    if (gender !== undefined) updateData.gender = gender;
    if (avatar !== undefined) updateData.avatar = avatar;

    if (newPassword) {
      if (user.passwordHash) {
        if (!oldPassword) {
          return reply.status(400).send({
            error: "Current password is required to change to a new password",
          });
        }

        const passwordMatch = await bcrypt.compare(oldPassword, user.passwordHash);
        if (!passwordMatch) {
          return reply.status(400).send({
            error: "The current password you entered is incorrect",
          });
        }
      }

      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    } else if (oldPassword) {
      return reply.status(400).send({
        error: "New password is required when supplying your current password",
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        gender: true,
        plan: true,
        aiGenerationsCount: true,
        aiGenerationsResetAt: true,
        createdAt: true,
      },
    });

    // Dispatch real-time notification
    createNotification({
      userId,
      title: "Profile Updated",
      message: "Your profile details and avatar were saved successfully.",
      type: "success",
      link: "/settings",
    }).catch(() => {});

    return reply.send({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({
      error: "Internal Server Error",
      details: error.message,
    });
  }
}

export async function upgradePlan(request: FastifyRequest, reply: FastifyReply) {
  const { plan } = request.body as { plan?: string };
  const userId = (request.user as any).id;

  if (!plan || !["FREE", "PRO_MONTHLY", "PRO_YEARLY"].includes(plan)) {
    return reply.status(400).send({
      error: "Bad Request: plan must be 'FREE', 'PRO_MONTHLY', or 'PRO_YEARLY'",
    });
  }

  try {
    // Update plan only — preserve aiGenerationsCount and aiGenerationsResetAt as-is
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { plan },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        gender: true,
        plan: true,
        aiGenerationsCount: true,
        aiGenerationsResetAt: true,
        createdAt: true,
      },
    });

    // Dispatch real-time notification
    createNotification({
      userId,
      title: "Plan Updated",
      message: `Successfully updated plan to ${plan.replace("_", " ")}.`,
      type: "success",
      link: "/settings?tab=plan",
    }).catch(() => {});

    return reply.send({
      message: `Plan updated to ${plan} successfully`,
      user: updatedUser,
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({
      error: "Internal Server Error",
      details: error.message,
    });
  }
}
