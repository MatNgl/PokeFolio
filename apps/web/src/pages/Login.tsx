import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import type { LoginDto } from '@pokefolio/types';

import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { PasswordInput } from '../components/ui/PasswordInput';
import { Button } from '../components/ui/Button';
import { Checkbox } from '../components/ui/Checkbox';
import { FullScreenLoader } from '../components/ui/FullScreenLoader';
import ColorBends from '../components/ui/ColorBends';
import styles from './Auth.module.css';

import { LogIn } from 'lucide-react';

export function Login() {
  // Définir le titre de la page
  useEffect(() => {
    document.title = 'PokéFolio - Connexion';
  }, []);

  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // — Persistance (optionnelle) du brouillon
  const persisted = (() => {
    try {
      return JSON.parse(localStorage.getItem('loginDraft') || '{}');
    } catch {
      return {};
    }
  })();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<LoginDto>({
    defaultValues: {
      email: persisted.email ?? '',
      password: persisted.password ?? '',
      rememberMe: persisted.rememberMe ?? false,
    },
    shouldUnregister: false,
  });

  useEffect(() => {
    const sub = watch((values: Partial<LoginDto>) => {
      localStorage.setItem('loginDraft', JSON.stringify(values));
    });
    return () => sub.unsubscribe();
  }, [watch]);

  const onSubmit = async (data: LoginDto) => {
    if (loading) return;
    try {
      setLoading(true);
      setError('');
      await login(data);
      localStorage.removeItem('loginDraft');
      navigate('/portfolio');
    } catch (err) {
      setError('Email ou mot de passe incorrect');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && <FullScreenLoader message="Connexion en cours..." />}
      <div className={styles.container} aria-hidden={loading}>
        <ColorBends
          colors={['#3b82f6', '#a855f7', '#f97316', '#10b981', '#06b6d4', '#ec4899']}
          rotation={30}
          speed={0.3}
          scale={0.6}
          frequency={1.6}
          warpStrength={1.0}
          mouseInfluence={0}
          parallax={0}
          noise={0.05}
          transparent
        />
        <Card className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>Connexion</h1>
            <p className={styles.subtitle}>Bienvenue sur PokéFolio</p>
          </div>

          {/* ⛑️ Antibug: on intercepte le submit natif quoi qu'il arrive */}
          <form
            noValidate
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Si tu veux tracer:
              // console.log('[Login] onSubmit intercepted');
              void handleSubmit(onSubmit)(e);
            }}
            onInvalid={(e) => {
              // Empêche le navigateur de recharger sur "enter" + contrainte native
              e.preventDefault();
            }}
          >
            <fieldset
              disabled={loading}
              aria-busy={loading}
              style={{ border: 0, padding: 0, margin: 0 }}
            >
              <Input
                label="Email"
                type="email"
                placeholder="votre@email.com"
                autoComplete="email"
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
                autoComplete={watch('rememberMe') ? 'current-password' : 'off'}
                error={errors.password?.message}
                {...register('password', { required: 'Mot de passe requis' })}
              />

              <Checkbox label="Rester connecté" {...register('rememberMe')} />

              {error && (
                <div className={styles.error} role="alert">
                  {error}
                </div>
              )}

              {/* Assure-toi que Button rend bien un <button type="submit"> */}
              <Button type="submit" size="lg" variant="info" disabled={loading}>
                <LogIn size={18} aria-hidden />
                Se connecter
              </Button>
            </fieldset>
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
    </>
  );
}
