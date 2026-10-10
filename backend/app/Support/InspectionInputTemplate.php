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
}
