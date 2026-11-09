import { AudioLines } from 'lucide-react';
export function Orb({ state = 'idle', small = false }: { state?: string; small?: boolean }) {
  return (
    <div className={`orb-stage ${small ? 'small' : ''} ${state}`} aria-hidden="true">
      <div className="orb-ring ring-one" />
      <div className="orb-ring ring-two" />
      <div className="orb-glow" />
      <div className="orb">
        <div className="orb-inner" />
        <AudioLines className="orb-wave" strokeWidth={1.4} />
      </div>
      <span className="orb-spark s1" />
      <span className="orb-spark s2" />
    </div>
  );
}
