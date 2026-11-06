import dynamic from 'next/dynamic';
import { DenahGedungSkeleton } from '@/components/Skeletons';

const MainLantai3 = dynamic(
  () => import('@/components/DenahVisual/DenahGedungLS/Lantai3/MainLantai3'),
  {
    loading: () => <DenahGedungSkeleton />,
  }
);

export default function Lantai3Page() {
  return <MainLantai3 />;
}
