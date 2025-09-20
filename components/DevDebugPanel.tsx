import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { logger } from '../utils/logger';

export default function DevDebugPanel() {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [logs, setLogs] = useState(logger.getLogs());

  useEffect(() => {
    const interval = setInterval(() => {
      setLogs(logger.getLogs());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!__DEV__) {
    return null;
  }

  const recentErrors = logs.filter(log => log.level === 'error').slice(-5);

  return (
    <>
      {/* Floating debug button */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          top: 50,
          right: 10,
          width: 50,
          height: 50,
          backgroundColor: recentErrors.length > 0 ? colors.status.error : colors.primary[500],
          borderRadius: 25,
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          elevation: 5,
        }}
        onPress={() => setIsVisible(true)}
      >
        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
          {recentErrors.length > 0 ? '!' : 'D'}
        </Text>
      </TouchableOpacity>

      {/* Debug panel modal */}
      <Modal
        visible={isVisible}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setIsVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: colors.background.primary,
          padding: spacing.lg,
        }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.lg,
          }}>
            <Text style={{
              fontSize: typography.size.xl,
              fontWeight: typography.weight.bold as any,
              color: colors.text.primary,
            }}>
              Debug Logs
            </Text>
            <TouchableOpacity
              onPress={() => setIsVisible(false)}
              style={{
                backgroundColor: colors.gray[200],
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: borderRadius.md,
              }}
            >
              <Text style={{ color: colors.text.primary }}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }}>
            {logs.slice(-20).reverse().map((log, index) => (
              <View
                key={index}
                style={{
                  backgroundColor: log.level === 'error' ? colors.status.error + '20' :
                                   log.level === 'warn' ? colors.status.warning + '20' :
                                   colors.background.card,
                  padding: spacing.md,
                  marginBottom: spacing.sm,
                  borderRadius: borderRadius.md,
                  borderLeftWidth: 4,
                  borderLeftColor: log.level === 'error' ? colors.status.error :
                                   log.level === 'warn' ? colors.status.warning :
                                   colors.primary[500],
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                  <Text style={{
                    fontSize: typography.size.sm,
                    fontWeight: typography.weight.semibold as any,
                    color: log.level === 'error' ? colors.status.error :
                           log.level === 'warn' ? colors.status.warning :
                           colors.text.primary,
                  }}>
                    {log.level.toUpperCase()}
                  </Text>
                  <Text style={{
                    fontSize: typography.size.xs,
                    color: colors.text.secondary,
                  }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
                <Text style={{
                  fontSize: typography.size.sm,
                  color: colors.text.primary,
                  marginBottom: log.data ? spacing.xs : 0,
                }}>
                  {log.message}
                </Text>
                {log.data && (
                  <Text style={{
                    fontSize: typography.size.xs,
                    color: colors.text.secondary,
                    fontFamily: 'monospace',
                  }}>
                    {JSON.stringify(log.data, null, 2)}
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}