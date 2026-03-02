import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { differenceInSeconds } from 'date-fns';
import { Colors } from '@/constants/colors';

interface AuctionTimerProps {
  endTime: string;
  isLive?: boolean;
  onExpired?: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
}

function calculateTimeLeft(endTime: string): TimeLeft {
  const totalSeconds = differenceInSeconds(new Date(endTime), new Date());

  if (totalSeconds <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isExpired: true };
  }

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, totalSeconds, isExpired: false };
}

export function AuctionTimer({
  endTime,
  isLive = false,
  onExpired,
}: AuctionTimerProps) {
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

  const pad = (n: number) => n.toString().padStart(2, '0');

  // Under 5 minutes = urgent (red)
  const isUrgent = !timeLeft.isExpired && timeLeft.totalSeconds < 300;

  if (isLive) {
    return (
      <View style={styles.liveContainer}>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>CANLI</Text>
        </View>
        {!timeLeft.isExpired && (
          <View style={[styles.timerRow, isUrgent && styles.timerRowUrgent]}>
            <TimeBlock value={pad(timeLeft.hours)} label="Sa" isUrgent={isUrgent} />
            <Text style={[styles.separator, isUrgent && styles.urgentColor]}>:</Text>
            <TimeBlock value={pad(timeLeft.minutes)} label="Dk" isUrgent={isUrgent} />
            <Text style={[styles.separator, isUrgent && styles.urgentColor]}>:</Text>
            <TimeBlock value={pad(timeLeft.seconds)} label="Sn" isUrgent={isUrgent} />
          </View>
        )}
      </View>
    );
  }

  if (timeLeft.isExpired) {
    return (
      <View style={styles.expiredContainer}>
        <Text style={styles.expiredText}>Sona Erdi</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.timerRow, isUrgent && styles.timerRowUrgent]}>
        {timeLeft.days > 0 && (
          <>
            <TimeBlock value={timeLeft.days.toString()} label="Gun" isUrgent={isUrgent} />
            <Text style={[styles.separator, isUrgent && styles.urgentColor]}>:</Text>
          </>
        )}
        <TimeBlock value={pad(timeLeft.hours)} label="Sa" isUrgent={isUrgent} />
        <Text style={[styles.separator, isUrgent && styles.urgentColor]}>:</Text>
        <TimeBlock value={pad(timeLeft.minutes)} label="Dk" isUrgent={isUrgent} />
        <Text style={[styles.separator, isUrgent && styles.urgentColor]}>:</Text>
        <TimeBlock value={pad(timeLeft.seconds)} label="Sn" isUrgent={isUrgent} />
      </View>
      {isUrgent && (
        <Text style={styles.urgentWarning}>Son dakikalar!</Text>
      )}
    </View>
  );
}

function TimeBlock({
  value,
  label,
  isUrgent,
}: {
  value: string;
  label: string;
  isUrgent: boolean;
}) {
  return (
    <View style={styles.timeBlock}>
      <View style={[styles.timeBlockInner, isUrgent && styles.timeBlockUrgent]}>
        <Text style={[styles.timeValue, isUrgent && styles.urgentColor]}>
          {value}
        </Text>
      </View>
      <Text style={[styles.timeLabel, isUrgent && styles.urgentColor]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 6,
  },
  liveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timerRowUrgent: {},
  timeBlock: {
    alignItems: 'center',
    gap: 2,
  },
  timeBlockInner: {
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  timeBlockUrgent: {
    backgroundColor: Colors.error + '15',
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  separator: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 14,
  },
  urgentColor: {
    color: Colors.error,
  },
  urgentWarning: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.error,
  },
  expiredContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.textTertiary + '15',
  },
  expiredText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textTertiary,
  },
});
