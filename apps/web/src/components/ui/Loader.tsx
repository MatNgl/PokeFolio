import styles from './Loader.module.css';

export function Loader() {
  return (
    <div className={styles.loader}>
      <div className={styles.box1}></div>
      <div className={styles.box2}></div>
      <div className={styles.box3}></div>
    </div>
  );
}
