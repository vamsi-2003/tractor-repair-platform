import React, { Component, ReactNode, ErrorInfo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { recordCrash } from '../services/crashReporting';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected error occurred',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Report crash to Supabase telemetry immediately
    recordCrash({
      error,
      componentStack: errorInfo.componentStack,
      severity: 'fatal',
      screenName: 'ReactErrorBoundary',
    });
  }

  handleRestart = () => {
    this.setState({ hasError: false, errorMessage: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#D32F2F" />
            </View>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>
              Tractor Seva encountered an unexpected error. Our technical team has been automatically notified.
            </Text>

            {__DEV__ && this.state.errorMessage ? (
              <View style={styles.debugBox}>
                <Text style={styles.debugText} numberOfLines={4}>
                  {this.state.errorMessage}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity style={styles.restartButton} onPress={this.handleRestart} activeOpacity={0.8}>
              <MaterialCommunityIcons name="reload" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.restartText}>Restart Tractor Seva</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  debugBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    marginBottom: 20,
  },
  debugText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#4B5563',
  },
  restartButton: {
    flexDirection: 'row',
    backgroundColor: '#006376',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  restartText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
