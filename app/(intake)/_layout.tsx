import { Stack } from 'expo-router';

export default function IntakeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: '#000000',
        },
      }}
    >
      <Stack.Screen name="chat" />
    </Stack>
  );
}
