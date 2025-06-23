import { isDemoMode } from "@/utils";
import { DemoSignUp } from "@/components/signup/DemoSignUp";
import { SignUp } from "@/components/signup/SignUp";

export default function SignupPage() {
  const demoMode = isDemoMode();
  if (demoMode) {
    return <DemoSignUp />;
  }
  return <SignUp />;
}
