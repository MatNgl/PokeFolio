import { ReactNode } from 'react';
import styles from './GradedCardFrame.module.css';

// Import des logos
import psaLogo from '../../assets/grading/logos/psa.png';
import bgsLogo from '../../assets/grading/logos/bgs.png';
import cgcLogo from '../../assets/grading/logos/cgc.png';
import pcaLogo from '../../assets/grading/logos/pca.png';
import collectauraLogo from '../../assets/grading/logos/collectaura.png';
import agsLogo from '../../assets/grading/logos/ags.png';
import cccLogo from '../../assets/grading/logos/ccc.png';
import sgcLogo from '../../assets/grading/logos/sgc.png';
import tagLogo from '../../assets/grading/logos/tag.png';
import otherLogo from '../../assets/grading/logos/other.png';

type GradingCompany =
  | 'PSA'
  | 'CollectAura'
  | 'BGS'
  | 'CGC'
  | 'PCA'
  | 'AGS'
  | 'CCC'
  | 'SGC'
  | 'TAG'
  | 'Other';

interface GradedCardFrameProps {
  company: GradingCompany;
  grade: string | number;
  children: ReactNode;
  size?: 'small' | 'medium' | 'large';
}

// Map des logos par société
const COMPANY_LOGOS: Record<GradingCompany, string> = {
  PSA: psaLogo,
  BGS: bgsLogo,
  CGC: cgcLogo,
  PCA: pcaLogo,
  CollectAura: collectauraLogo,
  AGS: agsLogo,
  CCC: cccLogo,
  SGC: sgcLogo,
  TAG: tagLogo,
  Other: otherLogo,
};

export default function GradedCardFrame({
  company,
  grade,
  children,
  size = 'small',
}: GradedCardFrameProps) {
  const logoSrc = COMPANY_LOGOS[company] || COMPANY_LOGOS.Other;
  const sizeClass = styles[`size-${size}`] || '';

  return (
    <div className={`${styles.gradedFrame} ${sizeClass}`}>
      {/* Étiquette blanche : logo à gauche, grade à droite */}
      <div className={styles.slabHeader}>
        <img src={logoSrc} alt={company} className={styles.logo} />
        <div className={styles.gradeDisplay}>
          <span className={styles.gradeValue}>{grade}</span>
        </div>
      </div>

      {/* Zone de la carte */}
      <div className={styles.cardArea}>{children}</div>
    </div>
  );
}
