import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { type LoginDto } from '@pokefolio/types';

import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { PasswordInput } from '../components/ui/PasswordInput';
import { Button } from '../components/ui/Button';
import styles from './Auth.module.css';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginDto>();

  const onSubmit = async (data: LoginDto) => {
    try {
      setLoading(true);
      setError('');
      await login(data);
      navigate('/dashboard');
    } catch (err) {
      setError('Email ou mot de passe incorrect');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Connexion</h1>
          <p className={styles.subtitle}>Bienvenue sur PokéFolio</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <Input
            label="Email"
            type="email"
            placeholder="votre@email.com"
            error={errors.email?.message}
            {...register('email', {
              required: 'Email requis',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Email invalide',
              },
            })}
          />

          <PasswordInput
            label="Mot de passe"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password', {
              required: 'Mot de passe requis',
            })}
          />

          <label className={styles.checkbox}>
            <input type="checkbox" {...register('rememberMe')} />
            <span>Rester connecté (30 jours)</span>
          </label>

          {error && <div className={styles.error}>{error}</div>}

          <Button type="submit" loading={loading} size="lg">
            Se connecter
          </Button>
        </form>

        <div className={styles.footer}>
          <p>
            Pas encore de compte ?{' '}
            <Link to="/register" className={styles.link}>
              S&apos;inscrire
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
