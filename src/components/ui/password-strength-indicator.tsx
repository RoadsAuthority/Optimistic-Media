import React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Requirement {
    label: string;
    regex: RegExp;
}

const requirements: Requirement[] = [
    { label: 'At least 8 characters', regex: /^.{8,}$/ },
    { label: 'At least one uppercase letter', regex: /[A-Z]/ },
    { label: 'At least one lowercase letter', regex: /[a-z]/ },
    { label: 'At least one number', regex: /[0-9]/ },
    { label: 'At least one special character', regex: /[^A-Za-z0-9]/ },
];

interface PasswordStrengthIndicatorProps {
    password: string;
    onValidChange?: (isValid: boolean) => void;
}

export function PasswordStrengthIndicator({ password, onValidChange }: PasswordStrengthIndicatorProps) {
    const results = requirements.map(req => ({
        ...req,
        met: req.regex.test(password),
    }));

    const allMet = results.every(res => res.met);

    React.useEffect(() => {
        onValidChange?.(allMet);
    }, [allMet, onValidChange]);

    if (!password) return null;

    return (
        <div className="mt-2 space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">Password requirements:</p>
            {results.map((res, i) => (
                <div key={i} className="flex items-center gap-2">
                    {res.met ? (
                        <Check className="h-3 w-3 text-green-500" />
                    ) : (
                        <X className="h-3 w-3 text-red-400" />
                    )}
                    <span className={cn(
                        "text-xs",
                        res.met ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                    )}>
                        {res.label}
                    </span>
                </div>
            ))}
        </div>
    );
}
