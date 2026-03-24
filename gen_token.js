
import jwt from "jsonwebtoken";
const JWT_SECRET = "realgo_secret";

const payload = {
    userId: "46d042f8-0857-4144-8d45-12005a8f58c7", // Brandwar admin ID
    phone: "9848520846",
    userType: "admin",
    companyId: "4bfd807c-7ad8-457b-bee5-9d39dc10e980",
    role: {
        roleName: "admin"
    }
};

const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
console.log(token);
