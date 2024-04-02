const handleException = require("../decorators/error");
const DashboardService = require("../services/dashboard");
const dashboardRouter = require("express").Router();

dashboardRouter.get("/:companyId/dashboard", handleException(async (req, res) => {
    try {
        const companyId = req.params.companyId;
        const dashboardServ = new DashboardService(req, res, req.query);
        const data = await dashboardServ.getdashboardData(companyId);

        res.json({
            data: {
                message: "Dashboard data retrieved successfully.",
                studentCount: data.studentCount,
                employeeCount: data.employeeCount,
                facultyCount: data.facultyCount,
                inquiryCount: data.inquiries
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));

module.exports = dashboardRouter;