import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: "Too many auth attempts, try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

export const gameLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, message: "Too many game requests, slow down" },
  standardHeaders: true,
  legacyHeaders: false,
});
