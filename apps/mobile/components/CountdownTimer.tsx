import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { differenceInSeconds } from 'date-fns';
import { Colors } from '@/constants/colors';

interface CountdownTimerProps {
  endTime: string;
  isEndingSoon?: boolean;
  size?: 'small' | 'medium' | 'large';
  onExpired?: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

function calculateTimeLeft(endTime: string): TimeLeft {
  const totalSeconds = differenceInSeconds(new Date(endTime), new Date());

  if (totalSeconds <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, isExpired: false };
}

export function CountdownTimer({
  endTime,
  isEndingSoon = false,
  size = 'small',
  onExpired,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    calculateTimeLeft(endTime)
  );

  const tick = useCallback(() => {
    const newTimeLeft = calculateTimeLeft(endTime);
    setTimeLeft(newTimeLeft);
    if (newTimeLeft.isExpired && onExpired) {
      onExpired();
    }
  }, [endTime, onExpired]);

  useEffect(() => {
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [tick]);

  if (timeLeft.isExpired) {
    return (
      <View style={styles.container}>
        <Text style={[styles.expiredText, sizeStyles[size].text]}>
          Sona Erdi
        </Text>
      </View>
    );
  }

  const isUrgent =
    isEndingSoon ||
    (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes < 5);

  const pad = (n: number) => n.toString().padStart(2, '0');

  const formatDisplay = (): string => {
    if (timeLeft.days > 0) {
      return `${timeLeft.days}g ${pad(timeLeft.hours)}s ${pad(timeLeft.minutes)}d`;
    }
    return `${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`;
  };

  return (
    <View style={[styles.container, isUrgent && styles.urgentContainer]}>
      <Text
        style={[
          styles.icon,
          sizeStyles[size].text,
          isUrgent && styles.urgentText,
        ]}
      >
        {isUrgent ? '!!' : ''}
      </Text>
      <Text
        style={[
          styles.timerText,
          sizeStyles[size].text,
          isUrgent && styles.urgentText,
        ]}
      >
        {formatDisplay()}
      </Text>
    </View>
  );
}

const sizeStyles = {
  small: StyleSheet.create({
    text: { fontSize: 12 },
  }),
  medium: StyleSheet.create({
    text: { fontSize: 14 },
  }),
  large: StyleSheet.create({
    text: { fontSize: 18 },
  }),
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  urgentContainer: {},
  icon: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  timerText: {
    color: Colors.textSecondary,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  urgentText: {
    color: Colors.error,
  },
  expiredText: {
    color: Colors.textTertiary,
    fontWeight: '500',
  },
});
