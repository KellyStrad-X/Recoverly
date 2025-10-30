import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Dimensions, PanResponder } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { SessionLog } from '@/types/plan';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DashboardTrackingProps {
  averagePain: number;
  activePlansCount: number;
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
  recentSessions,
}: DashboardTrackingProps) {
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current month, -1 = previous, +1 = next

  // Calculate current streak of consecutive days with sessions
  const calculateStreak = (): number => {
    if (recentSessions.length === 0) return 0;

    // Sort sessions by date (most recent first)
    const sortedSessions = [...recentSessions].sort((a, b) =>
      b.completedAt.toDate().getTime() - a.completedAt.toDate().getTime()
    );

    // Group sessions by day
    const sessionsByDay = new Map<string, boolean>();
    sortedSessions.forEach(session => {
      const date = session.completedAt.toDate();
      date.setHours(0, 0, 0, 0);
      const dateKey = date.getTime().toString();
      sessionsByDay.set(dateKey, true);
    });

    // Check for consecutive days starting from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    let currentDate = new Date(today);

    // Check if there's a session today or yesterday (allow for missed today)
    const todayKey = today.getTime().toString();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.getTime().toString();

    if (!sessionsByDay.has(todayKey) && !sessionsByDay.has(yesterdayKey)) {
      return 0; // Streak is broken
    }

    // Start counting from today if there's a session, otherwise from yesterday
    if (!sessionsByDay.has(todayKey)) {
      currentDate.setDate(currentDate.getDate() - 1);
    }

    // Count consecutive days
    while (sessionsByDay.has(currentDate.getTime().toString())) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  };

  const currentStreak = calculateStreak();

  // Generate calendar data for a specific month
  const generateCalendarData = (offset: number) => {
    const days = [];
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), today.getMonth() + offset, 1);

    // Get first and last day of the target month
    const firstDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const lastDay = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

    // Iterate through all days in the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(targetDate.getFullYear(), targetDate.getMonth(), day);
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

      // Check if this is today
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      const isToday = date.getTime() === todayDate.getTime();

      days.push({
        date,
        dayOfMonth: date.getDate(),
        hasSession: daysSessions.length > 0,
        avgPain,
        isToday,
      });
    }

    return days;
  };

  const calendarData = generateCalendarData(monthOffset);

  // Get month/year string for display
  const getMonthYearString = () => {
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    return targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Handle swipe gestures
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dx) > 20;
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx > 50) {
        // Swipe right - previous month
        setMonthOffset(monthOffset - 1);
      } else if (gestureState.dx < -50) {
        // Swipe left - next month
        setMonthOffset(monthOffset + 1);
      }
    },
  });

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

        {/* Streak Widget */}
        <View style={styles.widget}>
          <View style={styles.widgetHeader}>
            <MaterialCommunityIcons name="fire" size={14} color="#8E8E93" />
            <Text style={styles.widgetLabel}>Streak</Text>
          </View>
          <View style={styles.circularProgressContainer}>
            <View style={[styles.circularProgress, styles.streakProgress]}>
              <Text style={styles.circularProgressNumber}>{currentStreak}</Text>
            </View>
            <Text style={styles.circularProgressLabel}>Days</Text>
          </View>
        </View>
      </View>

      {/* Calendar Section */}
      <View style={styles.calendarSection} {...panResponder.panHandlers}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => setMonthOffset(monthOffset - 1)} style={styles.navButton}>
            <MaterialCommunityIcons name="chevron-left" size={20} color="#66BB6A" />
          </TouchableOpacity>
          <View style={styles.calendarTitleContainer}>
            <MaterialCommunityIcons name="calendar-month" size={16} color="#FFFFFF" />
            <Text style={styles.calendarTitle}>{getMonthYearString()}</Text>
          </View>
          <TouchableOpacity onPress={() => setMonthOffset(monthOffset + 1)} style={styles.navButton}>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#66BB6A" />
          </TouchableOpacity>
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
    marginBottom: 80,
  },
  widgetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  widget: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  wideWidget: {
    flex: 1.3,
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 3,
  },
  widgetLabel: {
    color: '#8E8E93',
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  painContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  painEmoji: {
    fontSize: 24,
  },
  painValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  painLabel: {
    color: '#66BB6A',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
  },
  circularProgressContainer: {
    alignItems: 'center',
    gap: 3,
  },
  circularProgress: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: '#66BB6A',
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakProgress: {
    borderColor: '#FF9800',
  },
  circularProgressNumber: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  circularProgressLabel: {
    color: '#8E8E93',
    fontSize: 8,
    fontWeight: '600',
  },
  calendarSection: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  calendarTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  calendarTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  navButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#2C2C2E',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  calendarDay: {
    alignItems: 'center',
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
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '500',
  },
});
