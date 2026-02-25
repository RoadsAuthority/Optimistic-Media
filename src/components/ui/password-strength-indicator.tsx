import React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PASSWORD_REQUIREMENTS, validatePassword } from '@/lib/auth-utils';

interface PasswordStrengthIndicatorProps {
    password: string;
    onValidChange?: (isValid: boolean) => void;
}

export function PasswordStrengthIndicator({ password, onValidChange }: PasswordStrengthIndicatorProps) {
    const results = PASSWORD_REQUIREMENTS.map(req => ({
        ...req,
        met: req.regex.test(password),
    }));

    const allMet = validatePassword(password);

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
