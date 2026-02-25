export interface PasswordRequirement {
    label: string;
    regex: RegExp;
}

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
    { label: 'At least 8 characters', regex: /^.{8,}$/ },
    { label: 'At least one uppercase letter', regex: /[A-Z]/ },
    { label: 'At least one lowercase letter', regex: /[a-z]/ },
    { label: 'At least one number', regex: /[0-9]/ },
    { label: 'At least one special character', regex: /[^A-Za-z0-9]/ },
];

export function validatePassword(password: string): boolean {
    return PASSWORD_REQUIREMENTS.every(req => req.regex.test(password));
}
