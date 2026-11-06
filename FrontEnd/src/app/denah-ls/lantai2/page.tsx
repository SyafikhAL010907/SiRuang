import dynamic from 'next/dynamic';
import { DenahGedungSkeleton } from '@/components/Skeletons';

const MainLantai2 = dynamic(
  () => import('@/components/DenahVisual/DenahGedungLS/Lantai2/MainLantai2'),
  {
    loading: () => <DenahGedungSkeleton />,
  }
);

export default function Lantai2Page() {
  return <MainLantai2 />;
}
