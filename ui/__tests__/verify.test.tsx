/**
 * Unit tests for OTP Verification Page
 * Tests OTP verification and token management
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams } from 'next/navigation';
import Cookies from 'js-cookie';
import VerifyPage from '../app/(public)/verify/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock js-cookie
jest.mock('js-cookie', () => ({
  set: jest.fn(),
  get: jest.fn(),
  remove: jest.fn(),
}));

// Mock fetch API
global.fetch = jest.fn();

describe('Verify Page', () => {
  const mockPush = jest.fn();
  const mockRouter = {
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  };

  const mockSearchParams = {
    get: jest.fn(),
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    mockSearchParams.get.mockReturnValue('+12345678901');
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('OTP Input', () => {
    it('should render 6 OTP input fields', () => {
      render(<VerifyPage />);

      const otpInputs = screen.getAllByRole('textbox');
      expect(otpInputs).toHaveLength(6);

      otpInputs.forEach(input => {
        expect(input).toHaveAttribute('maxLength', '1');
        expect(input).toHaveAttribute('inputMode', 'numeric');
      });
    });

    it('should auto-focus first input on mount', () => {
      render(<VerifyPage />);

      const firstInput = screen.getAllByRole('textbox')[0];
      expect(document.activeElement).toBe(firstInput);
    });

    it('should move focus to next input on digit entry', async () => {
      render(<VerifyPage />);

      const inputs = screen.getAllByRole('textbox');

      await userEvent.type(inputs[0], '1');
      expect(document.activeElement).toBe(inputs[1]);

      await userEvent.type(inputs[1], '2');
      expect(document.activeElement).toBe(inputs[2]);
    });

    it('should move focus to previous input on backspace', async () => {
      render(<VerifyPage />);

      const inputs = screen.getAllByRole('textbox');

      // Type digits
      await userEvent.type(inputs[0], '1');
      await userEvent.type(inputs[1], '2');

      // Now at input[2], press backspace
      await userEvent.keyboard('{Backspace}');
      expect(document.activeElement).toBe(inputs[1]);
    });

    it('should handle paste of 6-digit code', async () => {
      render(<VerifyPage />);

      const inputs = screen.getAllByRole('textbox');
      const pasteData = '123456';

      // Simulate paste event
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer(),
      });
      Object.defineProperty(pasteEvent.clipboardData, 'getData', {
        value: () => pasteData,
      });

      inputs[0].dispatchEvent(pasteEvent);

      await waitFor(() => {
        inputs.forEach((input, index) => {
          expect(input).toHaveValue(pasteData[index]);
        });
      });
    });

    it('should only accept numeric input', async () => {
      render(<VerifyPage />);

      const inputs = screen.getAllByRole('textbox');

      await userEvent.type(inputs[0], 'a');
      expect(inputs[0]).toHaveValue('');

      await userEvent.type(inputs[0], '1');
      expect(inputs[0]).toHaveValue('1');
    });
  });

  describe('OTP Verification', () => {
    it('should verify OTP when all digits entered', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          user: { id: '123', phone: '+12345678901' },
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        }),
      });

      render(<VerifyPage />);

      const inputs = screen.getAllByRole('textbox');
      const otp = '123456';

      // Enter OTP digits
      for (let i = 0; i < otp.length; i++) {
        await userEvent.type(inputs[i], otp[i]);
      }

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/auth/verify'),
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              phoneNumber: '+12345678901',
              otp: '123456',
            }),
          })
        );
      });
    });

    it('should store tokens in cookies on successful verification', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          user: { id: '123', phone: '+12345678901' },
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        }),
      });

      render(<VerifyPage />);

      const inputs = screen.getAllByRole('textbox');
      const otp = '123456';

      for (let i = 0; i < otp.length; i++) {
        await userEvent.type(inputs[i], otp[i]);
      }

      await waitFor(() => {
        expect(Cookies.set).toHaveBeenCalledWith('access_token', 'access-token', {
          expires: 7,
          sameSite: 'strict',
          secure: true,
        });
        expect(Cookies.set).toHaveBeenCalledWith('refresh_token', 'refresh-token', {
          expires: 30,
          sameSite: 'strict',
          secure: true,
        });
      });

      // Should redirect to home
      expect(mockPush).toHaveBeenCalledWith('/home');
    });

    it('should show error for invalid OTP', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Invalid or expired OTP',
        }),
      });

      render(<VerifyPage />);

      const inputs = screen.getAllByRole('textbox');
      const otp = '999999';

      for (let i = 0; i < otp.length; i++) {
        await userEvent.type(inputs[i], otp[i]);
      }

      await waitFor(() => {
        expect(screen.getByText('Invalid or expired OTP')).toBeInTheDocument();
      });

      // Should not redirect on error
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should handle network error', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<VerifyPage />);

      const inputs = screen.getAllByRole('textbox');
      const otp = '123456';

      for (let i = 0; i < otp.length; i++) {
        await userEvent.type(inputs[i], otp[i]);
      }

      await waitFor(() => {
        expect(screen.getByText(/Failed to verify OTP/)).toBeInTheDocument();
      });
    });

    it('should show loading state during verification', async () => {
      (fetch as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<VerifyPage />);

      const inputs = screen.getAllByRole('textbox');
      const otp = '123456';

      for (let i = 0; i < otp.length; i++) {
        await userEvent.type(inputs[i], otp[i]);
      }

      expect(screen.getByText('auth.verify.verifying')).toBeInTheDocument();
    });
  });

  describe('Resend OTP', () => {
    it('should show resend button after timer expires', async () => {
      jest.useFakeTimers();
      render(<VerifyPage />);

      // Initially, resend should be disabled
      expect(screen.getByText(/auth.verify.resendIn/)).toBeInTheDocument();

      // Fast-forward 60 seconds
      jest.advanceTimersByTime(60000);

      await waitFor(() => {
        expect(screen.getByText('auth.verify.resendOtp')).toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    it('should resend OTP when button clicked', async () => {
      jest.useFakeTimers();

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'OTP sent' }),
      });

      render(<VerifyPage />);

      // Fast-forward to enable resend
      jest.advanceTimersByTime(60000);

      await waitFor(() => {
        expect(screen.getByText('auth.verify.resendOtp')).toBeInTheDocument();
      });

      const resendButton = screen.getByText('auth.verify.resendOtp');
      await userEvent.click(resendButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/auth/otp'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ phoneNumber: '+12345678901' }),
          })
        );
      });

      jest.useRealTimers();
    });

    it('should reset timer after successful resend', async () => {
      jest.useFakeTimers();

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<VerifyPage />);

      // Fast-forward to enable resend
      jest.advanceTimersByTime(60000);

      const resendButton = await screen.findByText('auth.verify.resendOtp');
      await userEvent.click(resendButton);

      await waitFor(() => {
        expect(screen.getByText(/auth.verify.resendIn/)).toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  describe('Navigation', () => {
    it('should redirect to login if no phone number provided', () => {
      mockSearchParams.get.mockReturnValue(null);

      render(<VerifyPage />);

      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('should show back to login link', () => {
      render(<VerifyPage />);

      const backLink = screen.getByText('auth.verify.backToLogin');
      expect(backLink).toBeInTheDocument();
      expect(backLink.closest('a')).toHaveAttribute('href', '/login');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for OTP inputs', () => {
      render(<VerifyPage />);

      const inputs = screen.getAllByRole('textbox');
      inputs.forEach((input, index) => {
        expect(input).toHaveAttribute('aria-label', expect.stringContaining(`${index + 1}`));
      });
    });

    it('should announce errors to screen readers', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Invalid OTP',
        }),
      });

      render(<VerifyPage />);

      const inputs = screen.getAllByRole('textbox');
      const otp = '999999';

      for (let i = 0; i < otp.length; i++) {
        await userEvent.type(inputs[i], otp[i]);
      }

      await waitFor(() => {
        const errorMessage = screen.getByText('Invalid OTP');
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
    });

    it('should be keyboard navigable', async () => {
      render(<VerifyPage />);

      const inputs = screen.getAllByRole('textbox');

      // Tab through inputs
      for (let i = 0; i < inputs.length - 1; i++) {
        await userEvent.tab();
        expect(document.activeElement).toBe(inputs[i + 1]);
      }
    });
  });

  describe('Security', () => {
    it('should not display entered OTP in URL', async () => {
      render(<VerifyPage />);

      const inputs = screen.getAllByRole('textbox');
      const otp = '123456';

      for (let i = 0; i < otp.length; i++) {
        await userEvent.type(inputs[i], otp[i]);
      }

      // URL should not be modified with OTP
      expect(mockPush).not.toHaveBeenCalled();
      expect(mockRouter.replace).not.toHaveBeenCalled();
    });

    it('should clear OTP inputs on error', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Invalid OTP',
        }),
      });

      render(<VerifyPage />);

      const inputs = screen.getAllByRole('textbox');
      const otp = '999999';

      for (let i = 0; i < otp.length; i++) {
        await userEvent.type(inputs[i], otp[i]);
      }

      await waitFor(() => {
        inputs.forEach(input => {
          expect(input).toHaveValue('');
        });
      });
    });

    it('should use secure cookie settings', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          user: { id: '123' },
          accessToken: 'token',
          refreshToken: 'refresh',
        }),
      });

      render(<VerifyPage />);

      const inputs = screen.getAllByRole('textbox');
      const otp = '123456';

      for (let i = 0; i < otp.length; i++) {
        await userEvent.type(inputs[i], otp[i]);
      }

      await waitFor(() => {
        expect(Cookies.set).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.objectContaining({
            secure: true,
            sameSite: 'strict',
          })
        );
      });
    });
  });
});