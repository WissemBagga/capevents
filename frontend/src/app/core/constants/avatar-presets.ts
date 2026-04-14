export interface AvatarPreset {
  id: string;
  label: string;
  url: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'woman-blue', label: 'Avatar femme 1', url: 'images/avatars/woman-blue.png' },
  { id: 'woman-green', label: 'Avatar femme 2', url: 'images/avatars/woman-green.png' },
  { id: 'man-blue', label: 'Avatar homme 1', url: 'images/avatars/man-blue.png' },
  { id: 'man-green', label: 'Avatar homme 2', url: 'images/avatars/man-green.png' }
];