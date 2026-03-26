let currentEmail = '';
let currentOtp = '';

document.getElementById('emailForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const emailInput = document.getElementById('resetEmail');
  const errorDiv = document.getElementById('errorMessage');
  const btn = document.getElementById('btnStep1');

  currentEmail = emailInput.value.trim();
  errorDiv.textContent = '';
  errorDiv.style.color = 'var(--danger)';
  btn.innerHTML = '⏳ Sending OTP...'; 
  btn.style.opacity = '0.75';
  btn.disabled = true;

  try {
    const response = await fetchAPI('/auth/forgot-password', 'POST', { email: currentEmail });
    if (response.success) {
      document.getElementById('displayEmail').textContent = currentEmail;
      goToStep(2);
    } else {
      throw new Error(response.message || 'Failed to send OTP');
    }
  } catch (error) {
    errorDiv.textContent = error.message;
    shakeBox();
  } finally {
    btn.innerHTML = 'Send OTP';
    btn.style.opacity = '1';
    btn.disabled = false;
  }
});

document.getElementById('resendOtpBtn').addEventListener('click', async () => {
  const errorDiv = document.getElementById('errorMessage');
  const btn = document.getElementById('resendOtpBtn');
  
  errorDiv.textContent = '';
  errorDiv.style.color = 'var(--danger)';
  btn.textContent = 'Sending...';
  btn.disabled = true;

  try {
    const response = await fetchAPI('/auth/forgot-password', 'POST', { email: currentEmail });
    if (response.success) {
      errorDiv.style.color = '#4CAF50';
      errorDiv.textContent = 'OTP resent successfully!';
      setTimeout(() => { errorDiv.style.color = 'var(--danger)'; errorDiv.textContent = ''; }, 3000);
    } else {
      throw new Error(response.message || 'Failed to resend OTP');
    }
  } catch (error) {
    errorDiv.textContent = error.message;
    shakeBox();
  } finally {
    btn.textContent = 'Resend OTP';
    btn.disabled = false;
  }
});

document.getElementById('otpForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const otpInput = document.getElementById('otpCode');
  const errorDiv = document.getElementById('errorMessage');
  const btn = document.getElementById('btnStep2');

  currentOtp = otpInput.value.trim();
  errorDiv.textContent = '';
  errorDiv.style.color = 'var(--danger)';
  btn.innerHTML = '⏳ Verifying...';
  btn.style.opacity = '0.75';
  btn.disabled = true;

  try {
    const response = await fetchAPI('/auth/verify-otp', 'POST', { email: currentEmail, otp: currentOtp });
    if (response.success) {
      goToStep(3);
    } else {
      throw new Error(response.message || 'Invalid OTP');
    }
  } catch (error) {
    errorDiv.textContent = error.message;
    shakeBox();
  } finally {
    btn.innerHTML = 'Verify Code';
    btn.style.opacity = '1';
    btn.disabled = false;
  }
});

document.getElementById('resetForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const errorDiv = document.getElementById('errorMessage');
  const btn = document.getElementById('btnStep3');

  errorDiv.textContent = '';
  errorDiv.style.color = 'var(--danger)';

  if (newPassword.length < 6) {
    errorDiv.textContent = 'Password must be at least 6 characters long';
    shakeBox();
    return;
  }

  if (newPassword !== confirmPassword) {
    errorDiv.textContent = 'Passwords do not match';
    shakeBox();
    return;
  }

  btn.innerHTML = '⏳ Updating...';
  btn.style.opacity = '0.75';
  btn.disabled = true;

  try {
    const response = await fetchAPI('/auth/reset-password', 'POST', {
      email: currentEmail,
      otp: currentOtp,
      password: newPassword
    });

    if (response.success) {
      document.getElementById('step-3').style.display = 'none';
      document.getElementById('step-success').style.display = 'block';
    } else {
      throw new Error(response.message || 'Failed to reset password');
    }
  } catch (error) {
    errorDiv.textContent = error.message;
    shakeBox();
    btn.innerHTML = 'Update Password';
    btn.style.opacity = '1';
    btn.disabled = false;
  }
});

function goToStep(stepNumber) {
  document.getElementById('step-1').style.display = 'none';
  document.getElementById('step-2').style.display = 'none';
  document.getElementById('step-3').style.display = 'none';

  document.getElementById('step-' + stepNumber).style.display = 'block';

  // Update dots
  document.getElementById('dot1').classList.remove('active');
  document.getElementById('dot2').classList.remove('active');
  document.getElementById('dot3').classList.remove('active');

  for (let i = 1; i <= stepNumber; i++) {
    document.getElementById('dot' + i).classList.add('active');
  }

  if (typeof gsap !== 'undefined') {
    gsap.fromTo('#step-' + stepNumber, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
  }
}

function shakeBox() {
  if (typeof gsap !== 'undefined') {
    gsap.fromTo('#authBox', { x: -8 }, { x: 8, duration: 0.08, yoyo: true, repeat: 6, onComplete: () => gsap.set('#authBox', { x: 0 }) });
  }
}
