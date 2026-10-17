<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="utf-8">
    <title>정기점검 결과</title>
</head>
<body style="margin:0;padding:16px;font-family:'Malgun Gothic',Arial,sans-serif;font-size:14px;color:#1f2937;background:#ffffff;">
    <h1 style="margin:0 0 8px;font-size:20px;">정기점검 결과</h1>
    <p style="margin:0 0 16px;color:#4b5563;">아래와 같이 정기점검 결과를 알려드립니다.</p>

    <table role="presentation" cellpadding="6" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px;">
        @foreach ([
            '점검일자' => $inspection->inspected_on?->toDateString(),
            '고객사' => $inspection->equipment?->organization?->name,
            '장비명' => $inspection->equipment?->name,
            '장비 코드' => $inspection->equipment?->equipment_code,
            '장비 종류' => $categoryLabel,
            '점검자' => $inspection->creator?->name,
        ] as $label => $value)
            <tr>
                <th align="left" style="border:1px solid #d1d5db;background:#f3f4f6;font-weight:600;white-space:nowrap;">{{ $label }}</th>
                <td style="border:1px solid #d1d5db;">{{ $value ?: '-' }}</td>
            </tr>
        @endforeach
    </table>

    <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;">
        <thead>
            <tr style="background:#f3f4f6;">
                <th style="border:1px solid #d1d5db;width:36px;">No</th>
                <th align="left" style="border:1px solid #d1d5db;">{{ $labels['item'] }}</th>
                @if ($labels['standard'])
                    <th align="left" style="border:1px solid #d1d5db;">{{ $labels['standard'] }}</th>
                @endif
                @if ($labels['content'])
                    <th align="left" style="border:1px solid #d1d5db;">{{ $labels['content'] }}</th>
                @endif
                <th style="border:1px solid #d1d5db;width:64px;">{{ $labels['result'] }}</th>
                <th align="left" style="border:1px solid #d1d5db;">{{ $labels['remarks'] }}</th>
                <th style="border:1px solid #d1d5db;width:56px;">사진</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($rows as $row)
                <tr style="vertical-align:top;">
                    <td align="center" style="border:1px solid #d1d5db;">{{ $row['no'] }}</td>
                    <td style="border:1px solid #d1d5db;font-weight:600;">{{ $row['item'] }}</td>
                    @if ($labels['standard'])
                        <td style="border:1px solid #d1d5db;white-space:pre-wrap;">{{ $row['standard'] ?: '-' }}</td>
                    @endif
                    @if ($labels['content'])
                        <td style="border:1px solid #d1d5db;white-space:pre-wrap;">{{ $row['content'] ?: '-' }}</td>
                    @endif
                    <td align="center" style="border:1px solid #d1d5db;font-weight:600;color:{{ $row['is_bad'] ? '#b91c1c' : '#047857' }};">{{ $row['result'] }}</td>
                    <td style="border:1px solid #d1d5db;white-space:pre-wrap;">{{ $row['remarks'] ?: '-' }}</td>
                    <td align="center" style="border:1px solid #d1d5db;">{{ $row['photo_count'] ? $row['photo_count'].'장' : '-' }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <h2 style="margin:16px 0 8px;font-size:16px;">기타사항</h2>
    <p style="margin:0;white-space:pre-wrap;">{{ $inspection->remarks ?: '-' }}</p>

    @if (collect($rows)->sum('photo_count') > 0)
        <p style="margin:16px 0 0;color:#4b5563;">점검 사진은 첨부파일(item-항목번호-photo-순번)로 함께 보내드립니다.</p>
    @endif

    <p style="margin:24px 0 0;color:#6b7280;font-size:12px;">본 메일은 JYTS 장비 이력 관리 시스템에서 발송되었습니다.</p>
</body>
</html>
