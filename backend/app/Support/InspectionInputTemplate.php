<?php

namespace App\Support;

final class InspectionInputTemplate
{
    public const NUMBER_PATTERN = '/^-?\d+(\.\d+)?$/';

    /** @return list<'text'|'num'> */
    public static function fieldTypes(?string $template): array
    {
        preg_match_all('/\{(text|num)\}/', (string) $template, $matches);

        /** @var list<'text'|'num'> */
        return $matches[1];
    }

    /** @param  array<int, string|null>  $values */
    public static function fill(?string $template, array $values): string
    {
        $index = 0;

        return (string) preg_replace_callback('/\{(text|num)\}/', function () use (&$index, $values): string {
            $value = trim((string) ($values[$index++] ?? ''));

            return $value === '' ? '＿＿' : $value;
        }, (string) $template);
    }
}
