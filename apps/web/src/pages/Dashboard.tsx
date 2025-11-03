import styles from './Dashboard.module.css';

export default function Dashboard() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>
          Bienvenue sur ton Pokéfolio. Commence par rechercher des cartes pour les ajouter à ton
          portfolio.
        </p>
      </header>

      {/* Ici, plus tard : vraies stats summary via /portfolio/summary */}
      <section className={styles.cards}>
        <article className={styles.card}>
          <h3 className={styles.cardTitle}>Cartes totales</h3>
          <p className={styles.cardValue}>0</p>
        </article>
        <article className={styles.card}>
          <h3 className={styles.cardTitle}>Cartes distinctes</h3>
          <p className={styles.cardValue}>0</p>
        </article>
        <article className={styles.card}>
          <h3 className={styles.cardTitle}>Coût total (achat)</h3>
          <p className={styles.cardValue}>0 €</p>
        </article>
      </section>
    </main>
  );
}
