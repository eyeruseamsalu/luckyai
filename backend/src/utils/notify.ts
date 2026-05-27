import type { Types } from "mongoose";
import { Transaction } from "../models/Transaction.js";
import { Notification } from "../models/Notification.js";

export async function recordTransaction(
  userId: Types.ObjectId,
  type: "in" | "out" | "star",
  desc: string,
  amt: number,
) {
  return Transaction.create({ userId, type, desc, amt });
}

export async function recordNotification(
  userId: Types.ObjectId,
  icon: string,
  color: "ta" | "tp" | "tg" | "ts",
  msg: string,
) {
  return Notification.create({ userId, icon, color, msg, read: false });
}
