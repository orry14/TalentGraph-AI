import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { db, AuditLog } from '../db/dbClient.js';
import { Employee, Project } from '../db/seedData.js';

export function generateCSV(dataRows: string[][]): string {
  const esc = (value: any) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return dataRows.map(row => row.map(esc).join(',')).join('\n');
}

export async function generatePDF(title: string, creatorInfo: string, dataRows: string[][]): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([600, 800]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const drawHeader = (pageNum: number) => {
    page.drawText('TalentGraph Platform - Workforce Intelligence', { x: 50, y: 760, size: 10, font: boldFont, color: rgb(0.2, 0.4, 0.8) });
    page.drawText(`${title} | Creator: ${creatorInfo} | Date: ${new Date().toLocaleString()}`, { x: 50, y: 742, size: 8, font, color: rgb(0.5, 0.5, 0.5) });
    page.drawLine({ start: { x: 50, y: 730 }, end: { x: 550, y: 730 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    page.drawText(`Page ${pageNum}`, { x: 520, y: 760, size: 8, font, color: rgb(0.5, 0.5, 0.5) });
  };
  
  drawHeader(1);
  let y = 700;
  
  for (const row of dataRows) {
    if (y < 60) {
      page = pdfDoc.addPage([600, 800]);
      drawHeader(pdfDoc.getPageCount());
      y = 700;
    }
    
    // Very basic column alignment by spacing out cells
    let colX = 50;
    for (let i = 0; i < row.length; i++) {
      const cellText = String(row[i] || '');
      // rough column width estimation based on total columns
      const maxColWidth = Math.floor(500 / row.length);
      const truncated = cellText.length > Math.floor(maxColWidth / 6) 
        ? cellText.substring(0, Math.floor(maxColWidth / 6) - 2) + '..'
        : cellText;
        
      page.drawText(truncated, { x: colX, y, size: 8, font });
      colX += maxColWidth;
    }
    
    y -= 18;
  }
  
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function fetchExportData(reportType: string, filters: any, user: { id: string; role: string }): Promise<{ title: string; rows: string[][] }> {
  let title = `${reportType.toUpperCase()} Report`;
  let rows: string[][] = [];

  switch (reportType) {
    case 'dashboard': {
      const employees = await db.getEmployees();
      const projects = await db.getProjects();
      const headcount = employees.length;
      const projectCount = projects.length;
      
      title = 'Executive Dashboard Summary';
      rows = [
        ['Metric', 'Value'],
        ['Total Headcount', String(headcount)],
        ['Active Projects', String(projects.filter(p => p.status === 'Active').length)],
        ['Total Projects', String(projectCount)],
        ['Average Performance Rating', '85% (Mocked)'],
      ];
      break;
    }
    case 'employees': {
      let employees = await db.getEmployees();
      if (user.role === 'manager') {
        const me = employees.find(e => e.id === user.id);
        if (me) employees = employees.filter(e => e.department === me.department);
      } else if (user.role === 'employee') {
        employees = employees.filter(e => e.id === user.id);
      }
      
      title = 'Employee Directory';
      rows = [
        ['ID', 'Name', 'Email', 'Department', 'Role', 'Experience (Yrs)'],
        ...employees.map(e => [e.id, e.name, e.email, e.department, e.role, String(e.experienceYears || 0)])
      ];
      break;
    }
    case 'gap-analysis': {
      title = 'Skill Gap Report';
      // Basic mock gap data matching seedData
      rows = [
        ['Skill Name', 'Status', 'Current Average', 'Target', 'Difference'],
        ['React', 'critical', '3.2', '4.5', '-1.3'],
        ['NodeJS', 'moderate', '2.8', '3.5', '-0.7'],
        ['Kubernetes', 'critical', '1.5', '4.0', '-2.5'],
        ['Python', 'healthy', '4.2', '3.0', '+1.2']
      ];
      break;
    }
    case 'staffing': {
      title = 'Project Staffing Recommendations';
      const projectName = filters?.projectName || 'Proposed Project';
      rows = [
        ['Project Name', 'Required Skills', 'Team Size', 'Duration (Months)'],
        [projectName, (filters?.requiredSkills || []).join('; '), String(filters?.teamSize || 3), String(filters?.durationMonths || 6)]
      ];
      break;
    }
    case 'simulation': {
      title = 'Succession Simulation Result';
      rows = [
        ['Scenario Type', 'Target Employee ID', 'Delta Capability', 'Successor Recommendations'],
        [filters?.action || 'Succession', filters?.targetEmployeeId || 'N/A', '-0.5 (Mocked)', 'Ready Now (Mocked)']
      ];
      break;
    }
    case 'bench-cost': {
      const employees = await db.getEmployees();
      title = 'Bench Cost Report';
      rows = [['Employee ID', 'Name', 'Department', 'Role', 'Cost Rate (₹)', 'Billing Rate (₹)', 'Allocation %', 'Monthly Idle Cost (₹)']];
      
      let totalIdleCost = 0;
      employees.forEach(e => {
        const alloc = e.allocationPercentage !== undefined ? e.allocationPercentage : (e.currentProjects.length > 0 ? 100 : 0);
        const cost = e.cost_rate || 0;
        const billing = e.billing_rate || 0;
        const idleCost = (1 - (alloc / 100)) * cost;
        totalIdleCost += idleCost;
        
        if (idleCost > 0) {
          rows.push([e.id, e.name, e.department, e.role, String(cost), String(billing), String(alloc), String(idleCost)]);
        }
      });
      rows.push(['', '', '', '', '', '', 'Total Bench Cost:', String(totalIdleCost)]);
      break;
    }
    default:
      throw new Error('Unsupported report type');
  }

  return { title, rows };
}
