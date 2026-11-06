import MainLanding from '@/components/LandingPage/MainLanding';
import AppLoader from '@/components/LandingPage/AppLoader';

export default function Home() {
  return (
    <AppLoader>
      <MainLanding />
    </AppLoader>
  );
}
