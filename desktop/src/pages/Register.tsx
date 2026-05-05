import { motion } from "framer-motion";
import { PublicNavbar } from "@/components/PublicNavbar";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function Register() {
  return (
    <div className="min-h-screen bg-background flex items-start justify-center px-4 pt-20 pb-8 sm:pt-24">
      <PublicNavbar />
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-3xl p-7 sm:p-9"
          style={{ boxShadow: "var(--shadow-xl)" }}
        >
          <RegisterForm />
        </motion.div>
      </div>
    </div>
  );
}
