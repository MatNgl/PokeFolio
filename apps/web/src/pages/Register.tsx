import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { type RegisterDto } from '@pokefolio/types';

import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { PasswordInput } from '../components/ui/PasswordInput';
import { Button } from '../components/ui/Button';
import styles from './Auth.module.css';

type RegisterFormData = RegisterDto; // email, pseudo, password, confirmPassword

type ApiError = {
  response?: {
    data?: {
      message?: string | string[];
    };
  };
};

function hasThreeClasses(password: string): boolean {
  const classes =
    (/[a-z]/.test(password) ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/\d/.test(password) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(password) ? 1 : 0);
  return classes >= 3;
}

export function Register() {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>();

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData): Promise<void> => {
    try {
      setLoading(true);
      setError('');
      // on envoie bien confirmPassword au backend (aligné avec DTO)
      await registerUser({
        email: data.email.trim(),
        pseudo: data.pseudo.trim(),
        password: data.password,
        confirmPassword: data.confirmPassword,
      });
      navigate('/dashboard');
    } catch (err: unknown) {
      const e = err as ApiError;
      const message = e?.response?.data?.message ?? "Une erreur est survenue lors de l'inscription";
      setError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Inscription</h1>
          <p className={styles.subtitle}>Créez votre compte PokéFolio</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
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

          <Input
            label="Pseudo"
            type="text"
            placeholder="Pikachu123"
            error={errors.pseudo?.message}
            {...register('pseudo', {
              required: 'Pseudo requis',
              minLength: { value: 3, message: 'Minimum 3 caractères' },
              maxLength: { value: 24, message: 'Maximum 24 caractères' },
            })}
          />

          <PasswordInput
            label="Mot de passe"
            placeholder="••••••••••••"
            error={errors.password?.message}
            {...register('password', {
              required: 'Mot de passe requis',
              minLength: {
                value: 6,
                message: 'Au moins 6 caractères',
              },
              validate: (value) =>
                hasThreeClasses(value) ||
                'Au moins 3 catégories: majuscules, minuscules, chiffres, symboles',
            })}
          />

          <PasswordInput
            label="Confirmation du mot de passe"
            placeholder="••••••••••••"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword', {
              required: 'Veuillez confirmer votre mot de passe',
              validate: (value) => value === password || 'Les mots de passe ne correspondent pas',
            })}
          />

          <div className={styles.hint}>
            Mot de passe : ≥ 6 caractères & au moins 3 catégories parmi maj., min., chiffres,
            symboles.
          </div>

          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
          )}

          <Button type="submit" loading={loading} size="lg" aria-busy={loading}>
            Créer mon compte
          </Button>
        </form>

        <div className={styles.footer}>
          <p>
            Déjà un compte ?{' '}
            <Link to="/login" className={styles.link}>
              Se connecter
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
