export const HOLIDAY_TYPES = [
  { value: 'national', label: 'National', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'optional', label: 'Optional', badge: 'bg-sky-100 text-sky-800 border-sky-200' },
  { value: 'restricted', label: 'Restricted', badge: 'bg-violet-100 text-violet-800 border-violet-200' },
];

export function holidayTypeMeta(type) {
  return HOLIDAY_TYPES.find((t) => t.value === type) || HOLIDAY_TYPES[0];
}

/** Common Indian public holidays — dates vary by year; admin can edit after import. */
export function getIndiaNationalHolidayPresets(year) {
  const presets = {
    2025: [
      { name: 'Republic Day', date: '2025-01-26', holiday_type: 'national' },
      { name: 'Holi', date: '2025-03-14', holiday_type: 'national' },
      { name: 'Good Friday', date: '2025-04-18', holiday_type: 'national' },
      { name: 'Independence Day', date: '2025-08-15', holiday_type: 'national' },
      { name: 'Gandhi Jayanti', date: '2025-10-02', holiday_type: 'national' },
      { name: 'Diwali', date: '2025-10-20', holiday_type: 'national' },
      { name: 'Christmas', date: '2025-12-25', holiday_type: 'national' },
    ],
    2026: [
      { name: 'Republic Day', date: '2026-01-26', holiday_type: 'national' },
      { name: 'Holi', date: '2026-03-03', holiday_type: 'national' },
      { name: 'Good Friday', date: '2026-04-03', holiday_type: 'national' },
      { name: 'Independence Day', date: '2026-08-15', holiday_type: 'national' },
      { name: 'Gandhi Jayanti', date: '2026-10-02', holiday_type: 'national' },
      { name: 'Diwali', date: '2026-11-08', holiday_type: 'national' },
      { name: 'Christmas', date: '2026-12-25', holiday_type: 'national' },
    ],
    2027: [
      { name: 'Republic Day', date: '2027-01-26', holiday_type: 'national' },
      { name: 'Holi', date: '2027-03-22', holiday_type: 'national' },
      { name: 'Good Friday', date: '2027-03-26', holiday_type: 'national' },
      { name: 'Independence Day', date: '2027-08-15', holiday_type: 'national' },
      { name: 'Gandhi Jayanti', date: '2027-10-02', holiday_type: 'national' },
      { name: 'Diwali', date: '2027-10-29', holiday_type: 'national' },
      { name: 'Christmas', date: '2027-12-25', holiday_type: 'national' },
    ],
  };

  return presets[year] || [
    { name: 'Republic Day', date: `${year}-01-26`, holiday_type: 'national' },
    { name: 'Independence Day', date: `${year}-08-15`, holiday_type: 'national' },
    { name: 'Gandhi Jayanti', date: `${year}-10-02`, holiday_type: 'national' },
    { name: 'Christmas', date: `${year}-12-25`, holiday_type: 'national' },
  ];
}
