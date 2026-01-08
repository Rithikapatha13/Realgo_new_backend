import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "realgo_secret";
const JWT_EXPIRES_IN = "1d";

export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};
