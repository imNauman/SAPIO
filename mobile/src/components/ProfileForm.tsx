import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from './Input';
import { TextArea } from './TextArea';
import { Dropdown } from './Dropdown';
import { MultiSelect } from './MultiSelect';
import { DatePickerField } from './DatePickerField';
import { Button } from './Button';
import type { Gender, RelationshipGoal } from '../lib/api/profile.api';

/**
 * Shared profile form (create + edit).
 *
 * Why: Both the create and edit screens need the same fields, validation, and
 * layout. Centralizing it in one component keeps the UI consistent and avoids
 * duplicating React Hook Form wiring. The screen supplies `defaultValues`,
 * `onSubmit`, and `loading`.
 */

const GENDER_OPTIONS: { label: string; value: Gender }[] = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Non-binary', value: 'non_binary' },
  { label: 'Other', value: 'other' },
];

const GOAL_OPTIONS: { label: string; value: RelationshipGoal }[] = [
  { label: 'Casual', value: 'casual' },
  { label: 'Dating', value: 'dating' },
  { label: 'Serious', value: 'serious' },
  { label: 'Friendship', value: 'friendship' },
  { label: 'Marriage', value: 'marriage' },
];

const INTEREST_OPTIONS = GENDER_OPTIONS;

const BIO_MAX = 500;
const USERNAME_MIN = 3;
const USERNAME_MAX = 30;
const DISPLAY_NAME_MAX = 50;
const OCCUPATION_MAX = 80;
const EDUCATION_MAX = 80;
const CITY_MAX = 80;
const COUNTRY_MAX = 80;
const HEIGHT_MIN = 120;
const HEIGHT_MAX = 250;

const isAdult = (date: Date) => {
  const eighteen = new Date();
  eighteen.setFullYear(eighteen.getFullYear() - 18);
  return date <= eighteen;
};

const profileFormSchema = z.object({
  username: z
    .string()
    .min(USERNAME_MIN, `Min ${USERNAME_MIN} characters`)
    .max(USERNAME_MAX, `Max ${USERNAME_MAX} characters`)
    .regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers, underscore only')
    .optional()
    .or(z.literal('')),
  displayName: z
    .string()
    .max(DISPLAY_NAME_MAX, `Max ${DISPLAY_NAME_MAX} characters`)
    .optional()
    .or(z.literal('')),
  bio: z
    .string()
    .max(BIO_MAX, `Max ${BIO_MAX} characters`)
    .optional()
    .or(z.literal('')),
  birthDate: z
    .date({ invalid_type_error: 'Select your date of birth' })
    .refine(isAdult, 'You must be at least 18')
    .nullable(),
  gender: z.enum(['male', 'female', 'non_binary', 'other']).nullable(),
  interestedIn: z.array(z.enum(['male', 'female', 'non_binary', 'other'])),
  relationshipGoal: z
    .enum(['casual', 'dating', 'serious', 'friendship', 'marriage'])
    .nullable(),
  heightCm: z
    .number({ invalid_type_error: 'Enter a number' })
    .min(HEIGHT_MIN, `Min ${HEIGHT_MIN}`)
    .max(HEIGHT_MAX, `Max ${HEIGHT_MAX}`)
    .nullable(),
  occupation: z
    .string()
    .max(OCCUPATION_MAX, `Max ${OCCUPATION_MAX}`)
    .optional()
    .or(z.literal('')),
  education: z
    .string()
    .max(EDUCATION_MAX, `Max ${EDUCATION_MAX}`)
    .optional()
    .or(z.literal('')),
  city: z
    .string()
    .max(CITY_MAX, `Max ${CITY_MAX}`)
    .optional()
    .or(z.literal('')),
  country: z
    .string()
    .max(COUNTRY_MAX, `Max ${COUNTRY_MAX}`)
    .optional()
    .or(z.literal('')),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface ProfileFormProps {
  defaultValues?: Partial<ProfileFormValues>;
  onSubmit: (values: ProfileFormValues) => void;
  loading?: boolean;
  submitLabel?: string;
}

export function ProfileForm({
  defaultValues,
  onSubmit,
  loading = false,
  submitLabel = 'Save',
}: ProfileFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: '',
      displayName: '',
      bio: '',
      birthDate: null,
      gender: null,
      interestedIn: [],
      relationshipGoal: null,
      heightCm: null,
      occupation: '',
      education: '',
      city: '',
      country: '',
      ...defaultValues,
    },
  });

  const maxDate = React.useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d;
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Controller
        control={control}
        name="username"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Username"
            value={value ?? ''}
            onChangeText={onChange}
            placeholder="e.g. alex_92"
            autoCapitalize="none"
            error={errors.username?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="displayName"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Display name"
            value={value ?? ''}
            onChangeText={onChange}
            placeholder="e.g. Alex"
            error={errors.displayName?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="bio"
        render={({ field: { onChange, value } }) => (
          <TextArea
            label="Bio"
            value={value ?? ''}
            onChangeText={onChange}
            placeholder="Tell people about yourself"
            maxLength={BIO_MAX}
            error={errors.bio?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="birthDate"
        render={({ field: { onChange, value } }) => (
          <DatePickerField
            label="Date of birth"
            value={value}
            onChange={onChange}
            maximumDate={maxDate}
            error={errors.birthDate?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="gender"
        render={({ field: { onChange, value } }) => (
          <Dropdown
            label="Gender"
            value={value}
            onValueChange={onChange}
            options={GENDER_OPTIONS}
            placeholder="Select gender"
            error={errors.gender?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="interestedIn"
        render={({ field: { onChange, value } }) => (
          <MultiSelect
            label="Interested in"
            values={value ?? []}
            onValuesChange={onChange}
            options={INTEREST_OPTIONS}
            error={errors.interestedIn?.message as string | undefined}
          />
        )}
      />

      <Controller
        control={control}
        name="relationshipGoal"
        render={({ field: { onChange, value } }) => (
          <Dropdown
            label="Relationship goal"
            value={value}
            onValueChange={onChange}
            options={GOAL_OPTIONS}
            placeholder="Select goal"
            error={errors.relationshipGoal?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="heightCm"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Height (cm)"
            value={value != null ? String(value) : ''}
            onChangeText={(t) => onChange(t === '' ? null : Number(t))}
            placeholder="e.g. 175"
            keyboardType="numeric"
            error={errors.heightCm?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="occupation"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Occupation"
            value={value ?? ''}
            onChangeText={onChange}
            placeholder="e.g. Engineer"
            error={errors.occupation?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="education"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Education"
            value={value ?? ''}
            onChangeText={onChange}
            placeholder="e.g. BSc Computer Science"
            error={errors.education?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="city"
        render={({ field: { onChange, value } }) => (
          <Input
            label="City"
            value={value ?? ''}
            onChangeText={onChange}
            placeholder="e.g. London"
            error={errors.city?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="country"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Country"
            value={value ?? ''}
            onChangeText={onChange}
            placeholder="e.g. UK"
            error={errors.country?.message}
          />
        )}
      />

      <Button
        title={submitLabel}
        loading={loading}
        onPress={handleSubmit(onSubmit)}
        style={styles.submit}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%' },
  content: { padding: 20, paddingBottom: 40 },
  submit: { marginTop: 8 },
});
