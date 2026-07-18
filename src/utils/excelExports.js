import { format, parseISO } from 'date-fns';
import { employeeApi } from '../api';
import { ATTENDANCE_STATUS } from '../constants/hr';
import { ROLE_LABELS } from '../constants/routes';
import { MONTHS } from '../constants/payroll';
import { exportSheets } from './exportExcel';

function str(v) {
  if (v == null || v === '') return '';
  return String(v);
}

function num(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : '';
}

function formatDate(value) {
  if (!value) return '';
  try {
    return format(parseISO(String(value).slice(0, 10)), 'dd-MMM-yyyy');
  } catch {
    return String(value).slice(0, 10);
  }
}

export async function fetchAllEmployees(params = {}) {
  const limit = 500;
  let page = 1;
  let totalPages = 1;
  const employees = [];

  while (page <= totalPages) {
    const res = await employeeApi.list({ ...params, page, limit });
    employees.push(...(res?.data?.employees || []));
    totalPages = res?.pagination?.totalPages || 1;
    page += 1;
  }

  return employees;
}

export function employeesToRows(employees) {
  return employees.map((e) => ({
    'Emp Code': str(e.emp_code),
    'First Name': str(e.first_name),
    'Last Name': str(e.last_name),
    Email: str(e.email),
    Phone: str(e.phone),
    Department: str(e.department?.name),
    Designation: str(e.designation?.name),
    Branch: str(e.branch?.name),
    Status: str(e.status),
    'Employment Type': str(e.employment_type),
    Role: ROLE_LABELS[e.system_role] || str(e.system_role),
    'Date of Joining': formatDate(e.date_of_joining),
    'PF Applicable': e.pf_applicable ? 'Yes' : 'No',
    'ESI Applicable': e.esi_applicable ? 'Yes' : 'No',
    'Portal Active': e.is_portal_active === false ? 'No' : 'Yes',
    PAN: str(e.pan_number),
    'UAN Number': str(e.uan_number),
    'Bank Name': str(e.bank_name),
    'Account Number': str(e.account_number),
    IFSC: str(e.ifsc_code),
  }));
}

export function exportEmployeesExcel(employees, filename = 'employees.xlsx') {
  exportSheets(filename, [
    {
      name: 'Employees',
      rows: employeesToRows(employees),
      colWidths: [12, 14, 14, 24, 14, 16, 16, 14, 12, 14, 12, 14, 8, 8, 10, 14, 14, 16, 16, 12],
    },
  ]);
}

export async function exportEmployeesFromApi(params, filename) {
  const employees = await fetchAllEmployees(params);
  const stamp = format(new Date(), 'yyyy-MM-dd');
  exportEmployeesExcel(employees, filename || `employees-${stamp}.xlsx`);
  return employees.length;
}

function payslipStatusLabel(ps) {
  return ps.payrollRun?.status || ps.status || '';
}

export function payslipsToSummaryRows(payslips) {
  return payslips.map((ps) => ({
    'Emp Code': str(ps.employee?.emp_code),
    'Employee Name': [ps.employee?.first_name, ps.employee?.last_name].filter(Boolean).join(' '),
    Month: MONTHS[(ps.month || 1) - 1] || ps.month,
    Year: num(ps.year),
    'Working Days': num(ps.working_days),
    'Present Days': num(ps.present_days),
    'LOP Days': num(ps.lop_days),
    'Gross Salary': num(ps.gross_salary),
    'Total Deductions': num(ps.total_deductions),
    'Net Salary': num(ps.net_salary),
    'PF (Employee)': num(ps.pf_employee),
    'PF (Employer)': num(ps.pf_employer),
    'ESI (Employee)': num(ps.esic_employee),
    'ESI (Employer)': num(ps.esic_employer),
    TDS: num(ps.tds),
    'Professional Tax': num(ps.professional_tax),
    Bonus: num(ps.bonus),
    Arrears: num(ps.arrears),
    Overtime: num(ps.overtime_amount),
    'Total Payable': num(ps.total_payable),
    Status: payslipStatusLabel(ps),
  }));
}

export function payslipsToComponentRows(payslips) {
  const rows = [];
  for (const ps of payslips) {
    const emp = [ps.employee?.emp_code, ps.employee?.first_name, ps.employee?.last_name]
      .filter(Boolean)
      .join(' — ');
    const period = `${MONTHS[(ps.month || 1) - 1] || ps.month} ${ps.year}`;

    for (const line of ps.earnings || []) {
      rows.push({
        Employee: emp,
        Period: period,
        Type: 'Earning',
        Component: str(line.name),
        Amount: num(line.amount),
      });
    }
    for (const line of (ps.deductions || []).filter((d) => d.category !== 'employer')) {
      rows.push({
        Employee: emp,
        Period: period,
        Type: 'Deduction',
        Component: str(line.name),
        Amount: num(line.amount),
      });
    }
  }
  return rows;
}

export function exportPayslipsExcel(payslips, { month, year } = {}, filename) {
  const label = month && year ? `${MONTHS[month - 1]}-${year}` : format(new Date(), 'yyyy-MM-dd');
  exportSheets(filename || `payslips-${label}.xlsx`, [
    {
      name: 'Summary',
      rows: payslipsToSummaryRows(payslips),
      colWidths: [12, 22, 10, 8, 12, 12, 10, 14, 14, 14, 12, 12, 12, 12, 10, 14, 10, 10, 10, 14, 12],
    },
    {
      name: 'Components',
      rows: payslipsToComponentRows(payslips),
      colWidths: [28, 14, 12, 20, 12],
    },
  ]);
}

function attendanceDayLabel(day) {
  if (day.status) {
    const cfg = ATTENDANCE_STATUS[day.status];
    const base = cfg?.full || day.status.replace(/_/g, ' ');
    if (day.source === 'leave_sync' && day.leave_type?.code) {
      return `${base} (${day.leave_type.code})`;
    }
    return base;
  }
  if (day.day_type === 'holiday') return 'Holiday';
  if (day.day_type === 'weekend') return 'Weekend';
  if (day.day_type === 'not_employed') return 'Not employed';
  return 'Unmarked';
}

export function attendanceSummaryToRows(summaries) {
  return (summaries || []).map((s) => ({
    'Emp Code': str(s.emp_code),
    'Employee Name': str(s.name),
    Present: num(s.present),
    Absent: num(s.absent),
    Leave: num(s.leave),
    LOP: num(s.lop),
  }));
}

export function attendanceRegisterToRows(grid, dates) {
  const header = ['Emp Code', 'Employee Name', ...dates.map((d) => format(parseISO(d), 'dd-MMM'))];
  const data = [header];

  for (const { employee, days } of grid || []) {
    const row = [
      str(employee.emp_code),
      [employee.first_name, employee.last_name].filter(Boolean).join(' '),
      ...days.map((day) => attendanceDayLabel(day)),
    ];
    data.push(row);
  }

  return data;
}

export function exportAttendanceRegisterExcel(registerData, filename) {
  const { month, year, summaries, grid, dates } = registerData?.data || registerData || {};
  const label = month && year ? `${MONTHS[month - 1]}-${year}` : format(new Date(), 'yyyy-MM-dd');

  exportSheets(filename || `attendance-register-${label}.xlsx`, [
    {
      name: 'Summary',
      rows: attendanceSummaryToRows(summaries),
      colWidths: [12, 24, 10, 10, 10, 10],
    },
    {
      name: 'Daily Register',
      data: attendanceRegisterToRows(grid, dates),
    },
  ]);
}

export function attendanceDailyToRows(rows, date) {
  return (rows || []).map((row) => ({
    Date: formatDate(date),
    'Emp Code': str(row.employee?.emp_code),
    'Employee Name': [row.employee?.first_name, row.employee?.last_name].filter(Boolean).join(' '),
    Department: str(row.employee?.department?.name),
    Status: attendanceDayLabel(row),
    Shift: row.shift?.week_off ? 'Week Off' : str(row.shift?.name || row.shift?.code),
    'Day Type': str(row.day_type),
    Source: row.source === 'leave_sync' ? 'Leave sync' : row.source || '',
  }));
}

export function exportAttendanceDailyExcel(dailyData, filename) {
  const date = dailyData?.data?.date || dailyData?.date;
  const rows = dailyData?.data?.rows || dailyData?.rows || [];
  const stamp = date ? String(date).slice(0, 10) : format(new Date(), 'yyyy-MM-dd');

  exportSheets(filename || `attendance-daily-${stamp}.xlsx`, [
    {
      name: 'Daily',
      rows: attendanceDailyToRows(rows, date),
      colWidths: [12, 12, 24, 16, 16, 14, 12, 12],
    },
  ]);
}
