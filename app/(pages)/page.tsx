import WeatherDashboard from "@/components/weather-dashboard/WeatherDashboard";
import AuthGate from "@/components/auth/AuthGate";

export default function Home() {
  return (
    <>
    <AuthGate><WeatherDashboard /></AuthGate>
    </>
  );
}
