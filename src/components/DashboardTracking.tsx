import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { SessionLog } from '@/types/plan';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DashboardTrackingProps {
  averagePain: number;
  activePlansCount: number;
  completedPlansCount: number;
  recentSessions: SessionLog[];
}

// Pain level to emoji mapping
const getPainEmoji = (painLevel: number): string => {
  if (painLevel === 0) return '😊';
  if (painLevel <= 2) return '🙂';
  if (painLevel <= 4) return '😐';
  if (painLevel <= 6) return '😕';
  if (painLevel <= 8) return '😣';
  return '😖';
};

const getPainLabel = (painLevel: number): string => {
  if (painLevel === 0) return 'No Pain';
  if (painLevel <= 2) return 'Minimal';
  if (painLevel <= 4) return 'Moderate';
  if (painLevel <= 6) return 'Noticeable';
  if (painLevel <= 8) return 'Severe';
  return 'Extreme';
};

export default function DashboardTracking({
  averagePain,
  activePlansCount,
  completedPlansCount,
  recentSessions,
}: DashboardTrackingProps) {
  // Generate calendar data for last 30 days
  const generateCalendarData = () => {
    const days = [];
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      // Find sessions for this day
      const daysSessions = recentSessions.filter((session) => {
        const sessionDate = session.completedAt.toDate();
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === date.getTime();
      });

      // Calculate average pain for the day
      let avgPain = null;
      if (daysSessions.length > 0) {
        const totalPain = daysSessions.reduce(
          (sum, s) => sum + ((s.prePainScore + s.postPainScore) / 2),
          0
        );
        avgPain = Math.round(totalPain / daysSessions.length);
      }

      days.push({
        date,
        dayOfMonth: date.getDate(),
        hasSession: daysSessions.length > 0,
        avgPain,
        isToday: i === 0,
      });
    }

    return days;
  };

  const calendarData = generateCalendarData();

  // Get color based on pain level
  const getPainColor = (pain: number | null): string => {
    if (pain === null) return 'transparent';
    if (pain <= 2) return '#66BB6A'; // Green - low pain
    if (pain <= 5) return '#FFA726'; // Orange - moderate pain
    return '#EF5350'; // Red - high pain
  };

  return (
    <View style={styles.container}>
      {/* Widget Bubbles */}
      <View style={styles.widgetsRow}>
        {/* Average Pain Widget */}
        <View style={[styles.widget, styles.wideWidget]}>
          <View style={styles.widgetHeader}>
            <MaterialCommunityIcons name="heart-pulse" size={16} color="#8E8E93" />
            <Text style={styles.widgetLabel}>Avg Pain</Text>
          </View>
          <View style={styles.painContent}>
            <Text style={styles.painEmoji}>{getPainEmoji(averagePain)}</Text>
            <View>
              <Text style={styles.painValue}>{averagePain}/10</Text>
              <Text style={styles.painLabel}>{getPainLabel(averagePain)}</Text>
            </View>
          </View>
        </View>

        {/* Active Plans Widget */}
        <View style={styles.widget}>
          <View style={styles.widgetHeader}>
            <MaterialCommunityIcons name="clipboard-pulse" size={14} color="#8E8E93" />
            <Text style={styles.widgetLabel}>Active</Text>
          </View>
          <View style={styles.circularProgressContainer}>
            <View style={styles.circularProgress}>
              <Text style={styles.circularProgressNumber}>{activePlansCount}</Text>
            </View>
            <Text style={styles.circularProgressLabel}>Plans</Text>
          </View>
        </View>

        {/* Completed Plans Widget */}
        <View style={styles.widget}>
          <View style={styles.widgetHeader}>
            <MaterialCommunityIcons name="check-circle" size={14} color="#8E8E93" />
            <Text style={styles.widgetLabel}>Done</Text>
          </View>
          <View style={styles.circularProgressContainer}>
            <View style={[styles.circularProgress, styles.completedProgress]}>
              <Text style={styles.circularProgressNumber}>{completedPlansCount}</Text>
            </View>
            <Text style={styles.circularProgressLabel}>Plans</Text>
          </View>
        </View>
      </View>

      {/* Calendar Section */}
      <View style={styles.calendarSection}>
        <View style={styles.calendarHeader}>
          <MaterialCommunityIcons name="calendar-month" size={18} color="#FFFFFF" />
          <Text style={styles.calendarTitle}>30-Day Activity</Text>
        </View>

        <View style={styles.calendarGrid}>
          {calendarData.map((day, index) => (
            <View key={index} style={styles.calendarDay}>
              <View
                style={[
                  styles.calendarDot,
                  day.hasSession && { backgroundColor: getPainColor(day.avgPain) },
                  day.isToday && styles.todayBorder,
                ]}
              >
                {!day.hasSession && <View style={styles.emptyDot} />}
              </View>
              {(day.dayOfMonth === 1 || index === 0 || index === calendarData.length - 1) && (
                <Text style={styles.calendarDayLabel}>{day.dayOfMonth}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#66BB6A' }]} />
            <Text style={styles.legendText}>Low Pain</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FFA726' }]} />
            <Text style={styles.legendText}>Moderate</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EF5350' }]} />
            <Text style={styles.legendText}>High Pain</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginTop: 0,
    marginBottom: 32,
  },
  widgetsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  widget: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  wideWidget: {
    flex: 1.4,
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  widgetLabel: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  painContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  painEmoji: {
    fontSize: 32,
  },
  painValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  painLabel: {
    color: '#66BB6A',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  circularProgressContainer: {
    alignItems: 'center',
    gap: 6,
  },
  circularProgress: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#66BB6A',
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedProgress: {
    borderColor: '#4CAF50',
  },
  circularProgressNumber: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  circularProgressLabel: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '600',
  },
  calendarSection: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  calendarTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 12,
  },
  calendarDay: {
    alignItems: 'center',
    gap: 4,
  },
  calendarDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
  },
  emptyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3A3A3C',
  },
  todayBorder: {
    borderWidth: 2,
    borderColor: '#66BB6A',
  },
  calendarDayLabel: {
    color: '#8E8E93',
    fontSize: 9,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '500',
  },
});
