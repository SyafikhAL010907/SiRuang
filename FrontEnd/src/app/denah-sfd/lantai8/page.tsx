import dynamic from 'next/dynamic';
import { DenahGedungSkeleton } from '@/components/Skeletons';

const MainLantai8 = dynamic(
  () => import('@/components/DenahVisual/DenahGedungSFD/Lantai8/MainLantai8'),
  {
    loading: () => <DenahGedungSkeleton />,
  }
);

export default function Lantai8Page() {
  return <MainLantai8 />;
}
