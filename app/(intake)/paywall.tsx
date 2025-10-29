import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type PlanType = 'monthly' | 'annual';

export default function PaywallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual');
  const [loading, setLoading] = useState(false);

  // Parse protocol preview from params
  const protocolPreview = params.preview
    ? JSON.parse(params.preview as string)
    : null;

  const plans = {
    monthly: {
      price: '$9.99',
      period: 'month',
      total: '$9.99/month',
      savings: null,
    },
    annual: {
      price: '$79.99',
      period: 'year',
      total: '$6.66/month',
      savings: 'Save 33%',
    },
  };

  const features = [
    'Personalized AI recovery protocols',
    'Unlimited protocol generations',
    'Progress tracking & analytics',
    'Exercise video demonstrations',
    'Pain trend monitoring',
    'Adherence reminders',
  ];

  const handleSubscribe = async () => {
    setLoading(true);

    try {
      // TODO: Implement Stripe payment flow (Phase 3)
      // For now, simulate payment
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // TODO: Update user subscription status in Firestore
      console.log('Subscription successful:', selectedPlan);

      // Navigate to protocol details
      // TODO: Create protocol detail screen
      router.push('/(tabs)/dashboard');
    } catch (error) {
      console.error('Subscription error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons name="crown" size={48} color="#66BB6A" />
          <Text style={styles.title}>Unlock Your Recovery Plan</Text>
          <Text style={styles.subtitle}>
            Your personalized protocol is ready. Subscribe to access it and
            start your recovery journey.
          </Text>
        </View>

        {/* Protocol Preview */}
        {protocolPreview && (
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Your Protocol Includes:</Text>
            <View style={styles.previewList}>
              {protocolPreview.exercises?.map((exercise: any, index: number) => (
                <View key={index} style={styles.previewItem}>
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={20}
                    color="#66BB6A"
                  />
                  <Text style={styles.previewText}>{exercise.name}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.previewDuration}>
              {protocolPreview.duration} • {protocolPreview.frequency}
            </Text>
          </View>
        )}

        {/* Plan Selection */}
        <View style={styles.plansContainer}>
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'annual' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('annual')}
            activeOpacity={0.7}
          >
            <View style={styles.planHeader}>
              <View style={styles.planNameContainer}>
                <Text style={styles.planName}>Annual</Text>
                {plans.annual.savings && (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsText}>{plans.annual.savings}</Text>
                  </View>
                )}
              </View>
              <View style={styles.radioButton}>
                {selectedPlan === 'annual' && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </View>
            <Text style={styles.planPrice}>{plans.annual.price}</Text>
            <Text style={styles.planPeriod}>per {plans.annual.period}</Text>
            <Text style={styles.planTotal}>{plans.annual.total}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'monthly' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('monthly')}
            activeOpacity={0.7}
          >
            <View style={styles.planHeader}>
              <Text style={styles.planName}>Monthly</Text>
              <View style={styles.radioButton}>
                {selectedPlan === 'monthly' && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </View>
            <Text style={styles.planPrice}>{plans.monthly.price}</Text>
            <Text style={styles.planPeriod}>per {plans.monthly.period}</Text>
            <Text style={styles.planTotal}>{plans.monthly.total}</Text>
          </TouchableOpacity>
        </View>

        {/* Features List */}
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>What You'll Get:</Text>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <MaterialCommunityIcons
                name="check"
                size={20}
                color="#66BB6A"
              />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Subscribe Button */}
        <Button
          mode="contained"
          onPress={handleSubscribe}
          loading={loading}
          disabled={loading}
          style={styles.subscribeButton}
          contentStyle={styles.buttonContent}
          labelStyle={styles.subscribeButtonLabel}
        >
          {loading ? 'Processing...' : `Subscribe ${selectedPlan === 'annual' ? 'Annually' : 'Monthly'}`}
        </Button>

        {/* Fine Print */}
        <Text style={styles.finePrint}>
          Cancel anytime. Auto-renews unless cancelled. Terms apply.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
  },
  previewCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  previewLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#66BB6A',
    marginBottom: 16,
  },
  previewList: {
    marginBottom: 16,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  previewDuration: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
  },
  plansContainer: {
    marginBottom: 32,
  },
  planCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardSelected: {
    borderColor: '#66BB6A',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  planName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  savingsBadge: {
    backgroundColor: '#66BB6A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#66BB6A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#66BB6A',
  },
  planPrice: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  planPeriod: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 8,
  },
  planTotal: {
    fontSize: 17,
    fontWeight: '600',
    color: '#66BB6A',
  },
  featuresContainer: {
    marginBottom: 32,
  },
  featuresTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  subscribeButton: {
    borderRadius: 14,
    backgroundColor: '#66BB6A',
    marginBottom: 16,
  },
  buttonContent: {
    height: 56,
  },
  subscribeButtonLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  finePrint: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
  },
});
