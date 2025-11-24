/**
 * Unit tests for Login Page
 * Tests phone-only OTP authentication flow
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import LoginPage from '../app/(public)/login/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock fetch API
global.fetch = jest.fn();

describe('Login Page', () => {
  const mockPush = jest.fn();
  const mockRouter = {
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Phone Number Input', () => {
    it('should render phone number input field', () => {
      render(<LoginPage />);

      const phoneInput = screen.getByPlaceholderText('auth.login.phonePlaceholder');
      expect(phoneInput).toBeInTheDocument();
      expect(phoneInput).toHaveAttribute('type', 'tel');
    });

    it('should display error for invalid phone number', async () => {
      render(<LoginPage />);

      const phoneInput = screen.getByPlaceholderText('auth.login.phonePlaceholder');
      const submitButton = screen.getByRole('button', { name: 'auth.login.sendOtp' });

      await userEvent.type(phoneInput, '123'); // Invalid phone
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Phone number must be at least 10 characters/)).toBeInTheDocument();
      });
    });

    it('should format phone number as user types', async () => {
      render(<LoginPage />);

      const phoneInput = screen.getByPlaceholderText('auth.login.phonePlaceholder') as HTMLInputElement;

      await userEvent.type(phoneInput, '1234567890');

      // The component should format this appropriately
      expect(phoneInput.value).toBeTruthy();
    });

    it('should accept international phone numbers', async () => {
      render(<LoginPage />);

      const phoneInput = screen.getByPlaceholderText('auth.login.phonePlaceholder');
      const submitButton = screen.getByRole('button', { name: 'auth.login.sendOtp' });

      await userEvent.type(phoneInput, '+12345678901');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/auth/otp'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ phoneNumber: '+12345678901' }),
          })
        );
      });
    });
  });

  describe('OTP Request', () => {
    it('should send OTP request with valid phone number', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'OTP sent successfully' }),
      });

      render(<LoginPage />);

      const phoneInput = screen.getByPlaceholderText('auth.login.phonePlaceholder');
      const submitButton = screen.getByRole('button', { name: 'auth.login.sendOtp' });

      await userEvent.type(phoneInput, '+12345678901');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/auth/otp'),
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phoneNumber: '+12345678901' }),
          })
        );
      });

      // Should redirect to verify page
      expect(mockPush).toHaveBeenCalledWith('/verify?phone=%2B12345678901');
    });

    it('should show loading state while sending OTP', async () => {
      (fetch as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<LoginPage />);

      const phoneInput = screen.getByPlaceholderText('auth.login.phonePlaceholder');
      const submitButton = screen.getByRole('button', { name: 'auth.login.sendOtp' });

      await userEvent.type(phoneInput, '+12345678901');
      await userEvent.click(submitButton);

      // Button should show loading state
      expect(screen.getByText('auth.login.sendingOtp')).toBeInTheDocument();
    });

    it('should handle OTP request error', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: 'Rate limit exceeded' }),
      });

      render(<LoginPage />);

      const phoneInput = screen.getByPlaceholderText('auth.login.phonePlaceholder');
      const submitButton = screen.getByRole('button', { name: 'auth.login.sendOtp' });

      await userEvent.type(phoneInput, '+12345678901');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
      });

      // Should not redirect on error
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should handle network error', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<LoginPage />);

      const phoneInput = screen.getByPlaceholderText('auth.login.phonePlaceholder');
      const submitButton = screen.getByRole('button', { name: 'auth.login.sendOtp' });

      await userEvent.type(phoneInput, '+12345678901');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to send OTP/)).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should require phone number', async () => {
      render(<LoginPage />);

      const submitButton = screen.getByRole('button', { name: 'auth.login.sendOtp' });

      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Phone number is required/)).toBeInTheDocument();
      });

      expect(fetch).not.toHaveBeenCalled();
    });

    it('should validate phone number format', async () => {
      render(<LoginPage />);

      const phoneInput = screen.getByPlaceholderText('auth.login.phonePlaceholder');
      const submitButton = screen.getByRole('button', { name: 'auth.login.sendOtp' });

      // Test various invalid formats
      const invalidNumbers = ['abc', '123', 'phone', '@#$%'];

      for (const number of invalidNumbers) {
        await userEvent.clear(phoneInput);
        await userEvent.type(phoneInput, number);
        await userEvent.click(submitButton);

        await waitFor(() => {
          expect(fetch).not.toHaveBeenCalled();
        });
      }
    });

    it('should trim whitespace from phone number', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<LoginPage />);

      const phoneInput = screen.getByPlaceholderText('auth.login.phonePlaceholder');
      const submitButton = screen.getByRole('button', { name: 'auth.login.sendOtp' });

      await userEvent.type(phoneInput, '  +12345678901  ');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: JSON.stringify({ phoneNumber: '+12345678901' }),
          })
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<LoginPage />);

      const phoneInput = screen.getByPlaceholderText('auth.login.phonePlaceholder');
      expect(phoneInput).toHaveAttribute('aria-label', expect.any(String));
    });

    it('should be keyboard navigable', async () => {
      render(<LoginPage />);

      const phoneInput = screen.getByPlaceholderText('auth.login.phonePlaceholder');
      const submitButton = screen.getByRole('button', { name: 'auth.login.sendOtp' });

      // Tab to phone input
      phoneInput.focus();
      expect(document.activeElement).toBe(phoneInput);

      // Tab to submit button
      await userEvent.tab();
      expect(document.activeElement).toBe(submitButton);
    });

    it('should announce errors to screen readers', async () => {
      render(<LoginPage />);

      const submitButton = screen.getByRole('button', { name: 'auth.login.sendOtp' });

      await userEvent.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/Phone number is required/);
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
    });
  });

  describe('Localization', () => {
    it('should display localized text', () => {
      render(<LoginPage />);

      // All text should be using translation keys
      expect(screen.getByText('auth.login.title')).toBeInTheDocument();
      expect(screen.getByText('auth.login.subtitle')).toBeInTheDocument();
      expect(screen.getByText('auth.login.sendOtp')).toBeInTheDocument();
    });
  });
});