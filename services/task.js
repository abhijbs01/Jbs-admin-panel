const BaseService = require(".");
const User = require("../models/User");
const task = require("../models/task");
const Task = require("../models/task");
const mongoose = require('mongoose');

class TaskService extends BaseService {
    constructor(req, res, reqQuery) {
        super();
        this.req = req;
        this.res = res;
        this.reqQuery = reqQuery;
    }

    async createTask(companyId) {
        try {
            const {
                role, assign_id, task_title, create_date, due_date, priority, status, task_info, fullName
            } = this.req;

            const newTask = new Task({
                role,
                assign_id,
                task_title,
                create_date,
                due_date,
                status,
                priority,
                task_info,
                fullName,
                company_id: companyId,
            });

            const savedTask = await newTask.save();

            return savedTask;
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    async getTasks(companyId, assignId) {
        if (!mongoose.Types.ObjectId.isValid(assignId)) {
            throw new Error('Invalid user ID');
        }

        const page = parseInt(this.reqQuery.page) || 1;
        const pageSize = parseInt(this.reqQuery.pageSize) || 10;

        const user = await User.findOne({ _id: assignId, company_id: companyId, deleted_at: null });

        if (!user) {
            throw new Error('User not found');
        }

        let query = { deleted_at: null, company_id: companyId };

        const searchKey = this.req.query.searchKey;

        if (searchKey) {
            query = {
                deleted_at: null,
                $or: [
                    { role: { $regex: new RegExp(searchKey, 'i') } },
                    { status: { $regex: new RegExp(searchKey, 'i') } },
                    { priority: { $regex: new RegExp(searchKey, 'i') } },
                    { task_title: { $regex: new RegExp(searchKey, 'i') } },
                ],
            };
        }

        if (user.role !== 'Admin') {
            query.assign_id = assignId;
        }

        const totalDataCount = await Task.countDocuments(query);
        const totalPages = Math.ceil(totalDataCount / pageSize);

        const tasks = await Task.find(query)
            .skip((page - 1) * pageSize)
            .limit(pageSize);

        return {
            tasks,
            totalData: totalDataCount,
            totalPages,
            currentPage: page,
            pageSize,
        };
    }

    async getSingleTasks(companyId, taskId) {
        try {
            const tasks = await task.findOne({
                _id: taskId,
                company_id: companyId,
                deleted_at: null
            });

            if (!tasks) {
                this.res.status(404);
                throw new Error("task not found.");
            }

            return tasks;
        } catch (error) {
            throw new Error(`Error in getStudents: ${error.message}`);
        }
    }


    // async updateTask(taskId) {
    //     if (!this.req || Object.keys(this.req.body).length === 0) {
    //         this.res.status(400);
    //         throw new Error("No updates provided");
    //     }

    //     const updatedTask = await Task.findByIdAndUpdate(
    //         taskId,
    //         { $set: this.req.body },
    //         { new: true }
    //     );

    //     if (!updatedTask) {
    //         this.res.status(404);
    //         throw new Error('Task not found');
    //     }

    //     return updatedTask;
    // }

    async updateTask(taskId) {
        if (!this.req || Object.keys(this.req.body).length === 0) {
            this.res.status(400);
            throw new Error("No updates provided");
        }
    
        const updates = { $set: this.req.body };
    
        if (this.req.body.task_info) {
            updates.$push = { task_info: { $each: this.req.body.task_info } };
            delete updates.$set.task_info;
        }
    
        const updatedTask = await Task.findByIdAndUpdate(
            taskId,
            updates,
            { new: true }
        );
    
        if (!updatedTask) {
            this.res.status(404);
            throw new Error('Task not found');
        }
    
        return updatedTask;
    }
    

    async deleteTask(taskId) {
        try {
            const updatedTask = await Task.findByIdAndUpdate(
                taskId,
                { deleted_at: new Date() },
                { new: true }
            );

            if (!updatedTask) {
                this.res.status(404);
                throw new Error('Task not found');
            }

            return updatedTask;
        } catch (error) {
            console.error(error);
            throw new Error("Internal Server Error");
        }

    }

    async deleteTaskInfo(taskId, infoId) {
        const task = await Task.findById(taskId);

        if (!task) {
            this.res.status(404);
            throw new Error('Task not found');
        }

        const taskInfoIndex = task.task_info.findIndex(info => info._id == infoId);

        if (taskInfoIndex === -1) {
            this.res.status(404);
            throw new Error('Task info not found');
        }

        task.task_info.splice(taskInfoIndex, 1);
        await task.save();

        return task.task_info;
    }

    async deletemultipleTask (){
        const idsToDelete = this.req.body.ids;  
        const result = await Task.updateMany(
            { _id: { $in: idsToDelete } },
            { $set: { deleted_at: new Date() } }
        );
        return result;
    }

}

module.exports = TaskService;