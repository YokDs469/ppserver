const express = require('express');
const router = express.Router();
const getRelationship = require('../tools/getRelationship')
const { Op } = require('sequelize')
const db = require("../../models")
const postResponse = require('../tools/postResponse')

const { Post, Profile, User, ImagePost, Like } = db

router.get('/post', async (req, res) =>{
    const postFriend = await Profile.findAll({ include: [
        {model: User, as:"user", attributes: {exclude: ['password', 'updatedAt', 'createdAt']}, include: [
            {model: Post, as: "post", attributes: ["id", "title", "userId", "createdAt"], include: [
                "imagePost", "userLike"
            ]}
        ]}
    ] })
    res.json(postFriend)
})

module.exports = router;