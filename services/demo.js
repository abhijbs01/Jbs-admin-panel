const BaseService = require(".")
const Demo = require("../models/demo");
const mongoose = require('mongoose');
const inquiry = require("../models/inquiry");


class DemoService extends BaseService {
    constructor(req, res, reqQuery) {
        super();
        this.req = req;
        this.res = res;
        this.reqQuery = reqQuery;
    }

    async createDemo(companyId) {
        const { entries, inquiry_id } = this.req.body;

        const existingDemo = await Demo.findOne({ inquiry_id });

        const user = await inquiry.findOne({ _id: inquiry_id });

        if (!user) {
            return this.res.status(404).json({ error: "Inquiry not found." });
        }

        if (existingDemo) {
            if (existingDemo.entries.length < 3) {
                existingDemo.entries.push(...entries);
                await existingDemo.save();
                return this.res.json({ message: 'Data added to existing demo.' });
            } else {
                return this.res.json({ message: 'Sorry, only add 3 times.' });
            }
        } else {
            const newDemo = new Demo({
                entries,
                inquiry_id,
                fullName: user.firstName + " " + user.lastName,
                contact: user.contact,
                email: user.email,
                interested_in: user.interested_in,
                company_id: companyId,
            });

            await newDemo.save();
            return this.res.json({ message: 'New demo created successfully.' });
        }

    }

    async getDemos(companyId) {
        try {
            const page = parseInt(this.req.query.page) || 1;
            const limit = parseInt(this.req.query.limit) || 10;
            const startIndex = (page - 1) * limit;

            let query = { deleted_at: null, company_id: companyId };
            const searchKey = this.req.query.searchKey;

            if (searchKey) {
                query = {
                    $or: [
                        { fullName: { $regex: new RegExp(searchKey, 'i') } },
                        { email: { $regex: new RegExp(searchKey, 'i') } },
                        { contact: { $regex: new RegExp(searchKey, 'i') } },
                    ],
                };
            }

            const demos = await Demo.find(query)
                .skip(startIndex)
                .limit(limit);

            if (demos.length === 0) {
                return this.res.status(404).json({ message: "No Demo found" });
            }

            const total = await Demo.countDocuments(query);

            const filteredDemos = demos.map(demo => ({
                ...demo.toObject(),
                entries: demo.entries.filter(entry => entry.deleted_at === null)
            }));

            const demoData = {
                data: filteredDemos,
                total,
                currentPage: page,
                per_page: limit,
                totalPages: Math.ceil(total / limit),
            };

            return demoData;

        } catch (error) {
            console.error('Error fetching inquiries:', error);

            if (error.name === 'ValidationError') {
                return this.res.status(400).json({ success: false, error: 'Validation Error', details: error.errors });
            }

            this.res.status(500).json({ success: false, error: 'Internal Server Error', details: error.message });
        }
    }

    async getDemo() {
        const staffId = this.req.params.id;

        const staff = await Demo.findOne({
            _id: staffId,
            deleted_at: null
        });

        if (!staff) {
            throw new Error('Demo is not found');
        }

        staff.entries = staff.entries.filter(entry => entry.deleted_at === null);

        return staff;
    }

    async updateDemo() {
        const demoId = this.req.params.id;
        const entryId = this.req.params.entryId;

        const { faculty_name, note, date, time } = this.req.body;

        if (!mongoose.Types.ObjectId.isValid(entryId)) {
            throw new Error('Invalid entryId');
        }

        const updatedDemo = await Demo.findOneAndUpdate(
            {
                _id: demoId,
                'entries._id': entryId,
            },
            {
                $set: {
                    'entries.$.faculty_name': faculty_name,
                    'entries.$.note': note,
                    'entries.$.date': date,
                    'entries.$.time': time,
                },
            },
            {
                new: true,
            }
        );

        if (!updatedDemo) {
            throw new Error('Demo or Entry not found');
        }

        return updatedDemo;
    }

    async deleteDemo() {
        try {
            const demoId = this.req.params.id;
            const entryId = this.req.params.entryId;

            if (!mongoose.Types.ObjectId.isValid(entryId)) {
                throw new Error('Invalid entryId');
            }

            const updatedDemo = await Demo.findOneAndUpdate(
                { _id: demoId, 'entries._id': entryId },
                {
                    $set: {
                        'entries.$.deleted_at': new Date()
                    }
                },
                {
                    new: true
                }
            );

            if (!updatedDemo) {
                throw new Error('Demo not found');
            }

            if (updatedDemo.entries.every(entry => entry.deleted_at)) {
                updatedDemo.deleted_at = new Date();
                await updatedDemo.save();
            }

            this.res.status(200).json({ updatedDemo, message: 'Demo entry deleted successfully' });
        } catch (error) {
            console.error(error);
            this.res.status(500).json({ message: 'Internal Server Error' });
        }
    }
}

module.exports = DemoService