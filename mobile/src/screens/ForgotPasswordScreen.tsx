import React, { useState } from 'react';
import {
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { supabase } from '../config/supabase';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/RootNavigator';

/**
 * Forgot password screen.
 *
 * Why: Triggers Supabase's `resetPasswordForEmail`. We always show a success
 * message to avoid leaking whether an email is registered.
 */
const schema = z.object({
  email: z.string().email('Enter a valid email address'),
});

type FormValues = z.infer<typeof schema>;

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    setFormError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(values.email);
    setSubmitting(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setSent(true);
  });

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.subtitle}>
          Enter your email and we&apos;ll send a reset link.
        </Text>

        {sent ? (
          <Text style={styles.success}>
            If an account exists for that email, a reset link is on its way.
          </Text>
        ) : (
          <>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Email"
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={value}
                  onChangeText={onChange}
                  error={errors.email?.message ?? formError ?? undefined}
                />
              )}
            />

            <Button
              title="Send reset link"
              loading={submitting}
              onPress={onSubmit}
              style={styles.button}
            />
          </>
        )}

        <Button
          title="Back to log in"
          variant="secondary"
          onPress={() => navigation.navigate('Login')}
          style={styles.linkButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f9fafb',
  },
  title: { fontSize: 28, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 16, color: '#6b7280', marginBottom: 24 },
  success: {
    fontSize: 16,
    color: '#047857',
    backgroundColor: '#d1fae5',
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
  },
  button: { marginTop: 8 },
  linkButton: { marginTop: 8 },
});
