import dynamic from 'next/dynamic';
import { DenahGedungSkeleton } from '@/components/Skeletons';

const MainLantai4 = dynamic(
  () => import('@/components/DenahVisual/DenahGedungLE/Lantai4/MainLantai4'),
  {
    loading: () => <DenahGedungSkeleton />,
  }
);

export default function Lantai4Page() {
  return <MainLantai4 />;
}
