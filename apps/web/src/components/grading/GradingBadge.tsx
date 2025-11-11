// Import des logos
import psaLogo from '../../assets/grading/logos/psa.png';
import bgsLogo from '../../assets/grading/logos/bgs.png';
import cgcLogo from '../../assets/grading/logos/cgc.png';
import pcaLogo from '../../assets/grading/logos/pca.png';
import collectauraLogo from '../../assets/grading/logos/collectaura.png';
import otherLogo from '../../assets/grading/logos/other.png';
import styles from './GradingBadge.module.css';

type GradingCompany = 'PSA' | 'CollectAura' | 'BGS' | 'CGC' | 'PCA' | 'Other';

interface GradingBadgeProps {
  company: GradingCompany;
  grade: string | number;
}

const COMPANY_LOGOS: Record<GradingCompany, string> = {
  PSA: psaLogo,
  BGS: bgsLogo,
  CGC: cgcLogo,
  PCA: pcaLogo,
  CollectAura: collectauraLogo,
  Other: otherLogo,
};

export default function GradingBadge({ company, grade }: GradingBadgeProps) {
  const logoSrc = COMPANY_LOGOS[company] || COMPANY_LOGOS.Other;

  return (
    <div className={styles.badge}>
      <img src={logoSrc} alt={company} className={styles.logo} />
      <span className={styles.grade}>{grade}</span>
    </div>
  );
}
