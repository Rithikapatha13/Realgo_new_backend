import { verifyToken } from "../utils/jwt.js";

export const authMiddleware = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.code(401).send({
        success: false,
        message: "Authorization token missing"
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    req.user = decoded;
  } catch (error) {
    return res.code(401).send({
      success: false,
      message: "Invalid or expired token"
    });
  }
};
