import * as React from 'react';
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useI18n } from '../i18n/useI18n';
import { useTheme } from '../theme/useTheme';
import { Text } from '../ui/Text';
import { debugLogManager } from './LogManager';

type ErrorBoundaryFallbackRender = (
  error: Error | null,
  errorInfo: React.ErrorInfo | null,
  retry: () => void
) => React.ReactNode;

export type ErrorBoundaryProps = {
  children: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  fallback?: ErrorBoundaryFallbackRender;
  showDebugInfo?: boolean;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
};

function resolveShouldShowDebugInfo(showDebugInfo?: boolean) {
  if (typeof showDebugInfo === 'boolean') return showDebugInfo;
  return typeof __DEV__ !== 'undefined' ? __DEV__ : false;
}

function DefaultErrorFallback({
  error,
  errorInfo,
  onRetry,
  showDebugInfo,
}: {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  onRetry: () => void;
  showDebugInfo: boolean;
}) {
  const { t } = useI18n();
  const theme = useTheme();
  const errorMessage = React.useMemo(
    () => error?.message || t('debug.errorBoundary.unknownError'),
    [error, t]
  );
  const componentStack = errorInfo?.componentStack;

  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>{t('debug.errorBoundary.title')}</Text>
      <Text style={styles.errorMessage}>{errorMessage}</Text>

      {showDebugInfo && componentStack ? (
        <ScrollView
          style={styles.debugInfo}
          contentContainerStyle={styles.debugInfoContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.debugTitle}>{t('debug.errorBoundary.debugInfo')}</Text>
          <Text style={styles.debugText}>{componentStack}</Text>
        </ScrollView>
      ) : null}

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onRetry}
        style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
      >
        <Text style={styles.retryButtonText}>{t('debug.errorBoundary.retry')}</Text>
      </TouchableOpacity>
    </View>
  );
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    debugLogManager.addError('react', [
      `React Error: ${error.message}`,
      `Component Stack: ${errorInfo.componentStack}`,
      `Error Stack: ${error.stack || ''}`,
    ]);

    this.setState({
      error,
      errorInfo,
    });

    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback(
        this.state.error,
        this.state.errorInfo,
        this.handleRetry
      );
    }

    return (
      <DefaultErrorFallback
        error={this.state.error}
        errorInfo={this.state.errorInfo}
        onRetry={this.handleRetry}
        showDebugInfo={resolveShouldShowDebugInfo(this.props.showDebugInfo)}
      />
    );
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#DC3545',
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  debugInfo: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
    maxHeight: 200,
  },
  debugInfoContent: {
    padding: 16,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#666666',
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ErrorBoundary;
