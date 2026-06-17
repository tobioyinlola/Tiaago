"use server";

import axiosInstance, { publicAxiosInstance } from "../utils/axios.instance";
import serverKyInstance from "../utils/server-ky.instance";
import { omit } from "lodash";
import {
  GetPipelineResponse,
  ID,
  PipelineCategory,
  PipelineEntry,
  ServerCandidate,
  SourcingSearchInput,
} from "../types";
import { _handleServerApiCallError } from "../utils";

export const sourcingSearch = async (data: SourcingSearchInput) => {
  try {
    if (process.env.NODE_ENV !== "production") {
      const mockCandidates: ServerCandidate[] = [
        {
          name: "seun akanni",
          role: "frontend engineer",
          country: "nigeria",
          years_of_expr: 7,
          experience: [
            {
              company: {
                name: "mira",
                size: null,
                id: null,
                founded: null,
                industry: null,
                location: null,
                linkedin_url: null,
                linkedin_id: null,
                facebook_url: null,
                twitter_url: null,
                website: null,
                ticker: null,
                type: null,
              },
              location_names: [],
              end_date: null,
              start_date: "2023-04",
              title: {
                name: "frontend engineer",
                class: "research_and_development",
                role: "engineering",
                sub_role: "web",
                levels: [],
              },
              is_primary: true,
              summary: null,
            },
            {
              company: {
                name: "fluidcoins",
                size: "1-10",
                id: "qsrYZjVkIKOlRjQNUcw3Pwpo4koF",
                founded: 2021,
                industry: "financial services",
                location: {
                  name: "wilmington, delaware, united states",
                  locality: "wilmington",
                  region: "delaware",
                  metro: "philadelphia, pennsylvania",
                  country: "united states",
                  continent: "north america",
                  street_address: null,
                  address_line_2: null,
                  postal_code: "19808",
                  geo: "39.72,-75.53",
                },
                linkedin_url: "linkedin.com/company/fluidcoins",
                linkedin_id: "69898749",
                facebook_url: null,
                twitter_url: null,
                website: "fluidcoins.com",
                ticker: null,
                type: "private",
              },
              location_names: [],
              end_date: "2023-03",
              start_date: "2021-09",
              title: {
                name: "lead frontend (web + mobile) engineer",
                class: "research_and_development",
                role: "engineering",
                sub_role: "web",
                levels: ["manager"],
              },
              is_primary: false,
              summary:
                "Achievements:- Built Flip by Fluidcoins a mobile app that helps individuals earn, spend and save in stablecoins with over $1.5M in transaction volumes and over 25k users 9 weeks after launch.- Built all key merchant frontend products like dashboard, checkout widget, payment sdk, e.t.c, which has helped Fluidcoins in processing over $20 million in transaction volumes and onboarding over 1000 businesses .- Worked on building Reactnative, React and Vuejs library for our payment sdk and automated deployment with Github actions.- Continuously building Fluidshop, a no code e-commerce platform that allows merchants to sell products quickly and get paid in crypto.- Mentor junior frontend engineers.- Lead exploits in design reviews to ensure that our designs meet the standards set for our users,particularly those who are unfamiliar with cryptocurrency.- Helped the team by acting as both customer support and compliance officer on Flip by Fluidcoins.- E2E testing with Cypress and Github Actions for CI/CD.- Built the Fluidcoins Blog with Headless CMS and Nuxtjs to provide our users with up-to-date contenton new updates and general cryptocurrency knowledge.",
            },
            {
              company: {
                name: "bento",
                size: "11-50",
                id: "0KNMC2CrtlcQ7dLdZzxQfQX0iMYN",
                founded: 2016,
                industry: "information technology and services",
                location: {
                  name: "lagos, nigeria",
                  locality: null,
                  region: "lagos",
                  metro: null,
                  country: "nigeria",
                  continent: "africa",
                  street_address: null,
                  address_line_2: null,
                  postal_code: "yaba 00000",
                  geo: null,
                },
                linkedin_url: "linkedin.com/company/bentoafrica",
                linkedin_id: "15221113",
                facebook_url:
                  "web.facebook.com/bento-labs-africa-103844054788604",
                twitter_url: "twitter.com/bento_africa",
                website: "bento.africa",
                ticker: null,
                type: "private",
              },
              location_names: [],
              end_date: "2021-09",
              start_date: "2021-06",
              title: {
                name: "product lead (people by bento)",
                class: null,
                role: null,
                sub_role: null,
                levels: ["manager"],
              },
              is_primary: false,
              summary:
                "As a product lead, I was responsible for making People by Bento a bug-free application, adding new features, and engaging with HRs to learn how the product helps and how we can serve them better. I was also entrusted with leading a very young team of five junior engineers to fulfil all of these goals while doing my duties as a frontend engineer. While serving in this role, I was also a member of a small team entrusted with the company's development into Ghana. Making certain that Pay by Bento and People by Bento operate flawlessly in Ghana",
            },
            {
              company: {
                name: "bento",
                size: "11-50",
                id: "0KNMC2CrtlcQ7dLdZzxQfQX0iMYN",
                founded: 2016,
                industry: "information technology and services",
                location: {
                  name: "lagos, nigeria",
                  locality: null,
                  region: "lagos",
                  metro: null,
                  country: "nigeria",
                  continent: "africa",
                  street_address: null,
                  address_line_2: null,
                  postal_code: "yaba 00000",
                  geo: null,
                },
                linkedin_url: "linkedin.com/company/bentoafrica",
                linkedin_id: "15221113",
                facebook_url:
                  "web.facebook.com/bento-labs-africa-103844054788604",
                twitter_url: "twitter.com/bento_africa",
                website: "bento.africa",
                ticker: null,
                type: "private",
              },
              location_names: [],
              end_date: "2021-09",
              start_date: "2021-03",
              title: {
                name: "senior frontend engineer",
                class: "research_and_development",
                role: "engineering",
                sub_role: "web",
                levels: ["senior"],
              },
              is_primary: false,
              summary:
                "As a Senior Frontend Engineer for a payroll management firm, I was a member of a multi-functional team tasked with creating the finest payroll system possible to help businesses and employees save time and money. I also worked on the design system based on Vue.js, Vuetify, Storybook, and Bit.dev",
            },
            {
              company: {
                name: "bento",
                size: "11-50",
                id: "0KNMC2CrtlcQ7dLdZzxQfQX0iMYN",
                founded: 2016,
                industry: "information technology and services",
                location: {
                  name: "lagos, nigeria",
                  locality: null,
                  region: "lagos",
                  metro: null,
                  country: "nigeria",
                  continent: "africa",
                  street_address: null,
                  address_line_2: null,
                  postal_code: "yaba 00000",
                  geo: null,
                },
                linkedin_url: "linkedin.com/company/bentoafrica",
                linkedin_id: "15221113",
                facebook_url:
                  "web.facebook.com/bento-labs-africa-103844054788604",
                twitter_url: "twitter.com/bento_africa",
                website: "bento.africa",
                ticker: null,
                type: "private",
              },
              location_names: [],
              end_date: "2021-09",
              start_date: "2020-12",
              title: {
                name: "frontend engineer",
                class: "research_and_development",
                role: "engineering",
                sub_role: "web",
                levels: [],
              },
              is_primary: false,
              summary: null,
            },
            {
              company: {
                name: "redsofa",
                size: null,
                id: null,
                founded: null,
                industry: null,
                location: null,
                linkedin_url: null,
                linkedin_id: null,
                facebook_url: null,
                twitter_url: null,
                website: null,
                ticker: null,
                type: null,
              },
              location_names: [],
              end_date: "2021-09",
              start_date: "2019-03",
              title: {
                name: "software engineer",
                class: "research_and_development",
                role: "engineering",
                sub_role: "software",
                levels: [],
              },
              is_primary: false,
              summary:
                "Research software engineering choices and tools.Management of progress on KPIs and tasks using Trello.Maintain all software systems from development to production.Implementing real time applications using Socket.io .Creating reusable layouts, partials and flexible HTML templates using HandleBars.js and SCSS for prototyping thus reduce development time.Automate CSS and assets generation, assembling HandleBars templates using Grunt.Structure and build independent components using BEM methodology.Deploy all web applications to Heroku and Netlify for test purposes.Implementing modular, reusable components that are easy to maintain across React and Angular projects.Agile Development including daily stand-ups.Converting user interfaces from Figma.Brainstorming and idea generation using Retroly.io.Created a retrospective web application called Retroly and performed the role of a sole full-stack developer utilizing using MEAN stack.Collaborated as a sole front end developer in a fast-paced team to develop an e-commerce web application called Yanamode for fabrics using Angular. I developed both the user-facing frontend application and the merchant-facing frontend application.Actively using GitLab for all projects.",
            },
          ],
          email: "",
          linkdIn_profile: "linkedin.com/in/akanniseun",
          phone_number: "+",
          summary: null,
          current_company: "mira",
          education: "",
          skills: [
            "agile methodologies",
            "android",
            "android development",
            "angular",
            "api development",
            "cascading style sheets",
            "css",
            "css flexbox",
            "devops",
            "dynamic websites",
            "git",
            "grunt",
            "handlebars.js",
            "html",
            "html5",
            "java",
            "javascript",
            "jquery",
            "linux",
            "linux server",
            "mongodb",
            "mysql",
            "node.js",
            "nuxt.js",
            "php",
            "react native",
            "react.js",
            "responsive web design",
            "sass",
            "scss",
            "slim framework",
            "software development",
            "sql",
            "typescript",
            "vue.js",
            "web development",
            "web services",
            "website building",
            "windows server",
          ],
        },
        {
          name: "victor mbarachi",
          role: "senior frontend engineer",
          country: "nigeria",
          years_of_expr: 7,
          experience: [
            {
              company: {
                name: "rigo inc(formerly nucleusis africa)",
                size: "1-10",
                id: "lCPr8i8f9byxtLamcjVjUg9AeqBY",
                founded: null,
                industry: "financial services",
                location: {
                  name: "lekki, lagos, nigeria",
                  locality: "lekki",
                  region: "lagos",
                  metro: null,
                  country: "nigeria",
                  continent: "africa",
                  street_address:
                    "13 rasheed alaba williams street lekki phase i",
                  address_line_2: null,
                  postal_code: null,
                  geo: "6.41,4.09",
                },
                linkedin_url: "linkedin.com/company/rigoinc",
                linkedin_id: "71539078",
                facebook_url: null,
                twitter_url: null,
                website: "rigohq.com",
                ticker: null,
                type: "private",
              },
              location_names: [],
              end_date: null,
              start_date: "2023-09",
              title: {
                name: "senior frontend engineer",
                class: "research_and_development",
                role: "engineering",
                sub_role: "web",
                levels: ["senior"],
              },
              is_primary: true,
              summary: null,
            },
            {
              company: {
                name: "medismarts limited",
                size: "1-10",
                id: "Fzo8NhWoq7KTLjhNb9LFGQcr8yeF",
                founded: 2015,
                industry: "computer software",
                location: {
                  name: "lekki, lagos, nigeria",
                  locality: "lekki",
                  region: "lagos",
                  metro: null,
                  country: "nigeria",
                  continent: "africa",
                  street_address: "5 admiralty road lekki lagos",
                  address_line_2: null,
                  postal_code: "+234",
                  geo: "6.41,4.09",
                },
                linkedin_url: "linkedin.com/company/medismarts-ng",
                linkedin_id: "14072672",
                facebook_url: null,
                twitter_url: null,
                website: "medismarts.com.ng",
                ticker: null,
                type: "private",
              },
              location_names: [],
              end_date: "2023-09",
              start_date: "2019-11",
              title: {
                name: "software engineer",
                class: "research_and_development",
                role: "engineering",
                sub_role: "software",
                levels: [],
              },
              is_primary: false,
              summary:
                "* Use the latest version of IONIC framework (REACT) to build and maintain mobile applications,\n* Proficiency using Angular framework.\n* consume APIs in order to populate the frontend with data.\n* Develop new user-facing features\n* Maintain Web Platforms\n* Ensure that all user inputs are validated before submitting to the back-end.\n* Deployment of various mobile applications to both Android and IOS platforms.",
            },
            {
              company: {
                name: "andela",
                size: "201-500",
                id: "HwVPK3mWrKBcVzbd0xNKfwODjLDa",
                founded: 2014,
                industry: "information technology and services",
                location: {
                  name: "new york, new york, united states",
                  locality: "new york",
                  region: "new york",
                  metro: "new york, new york",
                  country: "united states",
                  continent: "north america",
                  street_address: "580 5th avenue",
                  address_line_2: "suite 820",
                  postal_code: "10036",
                  geo: "40.75,-73.98",
                },
                linkedin_url: "linkedin.com/company/andela",
                linkedin_id: "5351527",
                facebook_url: "facebook.com/thisisandela",
                twitter_url: "twitter.com/andela",
                website: "andela.com",
                ticker: null,
                type: "private",
              },
              location_names: [],
              end_date: "2018-07",
              start_date: "2018-05",
              title: {
                name: "web developer",
                class: "research_and_development",
                role: "engineering",
                sub_role: null,
                levels: [],
              },
              is_primary: false,
              summary:
                "Certified web developer; successfully completed the Google Africa scholarship Front end course. Supported by Andela Learning Community(ALC) and UDACITY. Powered by Google.",
            },
            {
              company: {
                name: "pbg communications",
                size: null,
                id: null,
                founded: null,
                industry: null,
                location: null,
                linkedin_url: null,
                linkedin_id: null,
                facebook_url: null,
                twitter_url: null,
                website: null,
                ticker: null,
                type: null,
              },
              location_names: [],
              end_date: "2018-11",
              start_date: "2017-10",
              title: {
                name: "front-end developer",
                class: "research_and_development",
                role: "engineering",
                sub_role: null,
                levels: [],
              },
              is_primary: false,
              summary:
                "* Build, design, and manage websites using HTML and CSS, as well as PHP and JavaScript\n* Provide visual identity, web design, graphic design, html emails, and editing services for small businesses.\n* Build websites using knowledge of code, design principles, SEO and content management systems.\n* Focus on client relationships and satisfaction, which has led to business growing primarily by word of mouth.",
            },
          ],
          email: "",
          linkdIn_profile: "linkedin.com/in/mbarachi1",
          phone_number: "",
          summary: null,
          current_company: "rigo inc(formerly nucleusis africa)",
          education: "bachelor of science",
          skills: [
            "adobe photoshop",
            "amazon web services",
            "android deployment",
            "angular",
            "angularjs",
            "babel.js",
            "cascading style sheets",
            "english",
            "excellent organizational skills",
            "high level attention to details",
            "html",
            "ionic framework",
            "ionic framwork",
            "ios deployment",
            "javascript",
            "json",
            "mailchimp",
            "microsoft azure",
            "mysql",
            "next.js",
            "node.js",
            "react.js",
            "redux.js",
            "rest apis",
            "strong writing and verbal communication skills",
            "tailwind css",
            "time management",
            "typescript",
            "version control tools",
            "webpack",
            "wordpress",
          ],
        },
        {
          name: "cynthia ilojeme",
          role: "senior frontend developer",
          country: "nigeria",
          years_of_expr: 7,
          experience: [
            {
              company: {
                name: "enyata",
                size: "51-200",
                id: "j51Rq9usRB2BCYOSGkx3TQqbMIMY",
                founded: 2019,
                industry: "information technology and services",
                location: {
                  name: "toronto, ontario, canada",
                  locality: "toronto",
                  region: "ontario",
                  metro: null,
                  country: "canada",
                  continent: "north america",
                  street_address: null,
                  address_line_2: null,
                  postal_code: "m5j 2p1",
                  geo: "43.65,-79.39",
                },
                linkedin_url: "linkedin.com/company/enyata",
                linkedin_id: "14031965",
                facebook_url: null,
                twitter_url: null,
                website: "enyata.com",
                ticker: null,
                type: "private",
              },
              location_names: [],
              end_date: null,
              start_date: "2023-08",
              title: {
                name: "senior frontend developer",
                class: "research_and_development",
                role: "engineering",
                sub_role: null,
                levels: ["senior"],
              },
              is_primary: true,
              summary:
                "* Rebuilt a critical healthcare dashboard from scratch, improving operational tracking\n* speed by 35%.\n* Integrated real-time document notarization using Agora and Firebase for Tonote, scaling\n* the platform to process thousands of secure transactions monthly, significantly boosting\n* client trust and platform adoption.\n* Designed and launched internal component libraries and UI kits, reducing new project\n* setup time by 30% and standardizing visual consistency across multiple products.\n* Introduced frontend performance benchmarks and enforced best practices through critical code reviews, resulting in a 20% improvement in page load speeds across major projects.",
            },
            {
              company: {
                name: "enyata",
                size: "51-200",
                id: "j51Rq9usRB2BCYOSGkx3TQqbMIMY",
                founded: 2019,
                industry: "information technology and services",
                location: {
                  name: "toronto, ontario, canada",
                  locality: "toronto",
                  region: "ontario",
                  metro: null,
                  country: "canada",
                  continent: "north america",
                  street_address: null,
                  address_line_2: null,
                  postal_code: "m5j 2p1",
                  geo: "43.65,-79.39",
                },
                linkedin_url: "linkedin.com/company/enyata",
                linkedin_id: "14031965",
                facebook_url: null,
                twitter_url: null,
                website: "enyata.com",
                ticker: null,
                type: "private",
              },
              location_names: [],
              end_date: "2023-07",
              start_date: "2021-08",
              title: {
                name: "frontend engineer",
                class: "research_and_development",
                role: "engineering",
                sub_role: "web",
                levels: [],
              },
              is_primary: false,
              summary:
                "Led frontend development for Kafene’s core platforms—merchant, admin, and customer dashboards—driving enhancements that contributed to over $20M in revenue growth.",
            },
            {
              company: {
                name: "kafene",
                size: "51-200",
                id: "xlGjcx1v9wT02IqylHbCCAUMVFu8",
                founded: 2019,
                industry: "financial services",
                location: {
                  name: "new york, new york, united states",
                  locality: "new york",
                  region: "new york",
                  metro: "new york, new york",
                  country: "united states",
                  continent: "north america",
                  street_address: "44 west 28th street",
                  address_line_2: null,
                  postal_code: "10001",
                  geo: "40.75,-73.98",
                },
                linkedin_url: "linkedin.com/company/kafene",
                linkedin_id: "38792894",
                facebook_url: "facebook.com/kafene-inc-655800184937339",
                twitter_url: "twitter.com/kafene_inc",
                website: "kafene.com",
                ticker: null,
                type: "private",
              },
              location_names: [],
              end_date: "2023-07",
              start_date: "2021-08",
              title: {
                name: "frontend engineer (outsourced by enyata)",
                class: "research_and_development",
                role: "engineering",
                sub_role: "web",
                levels: [],
              },
              is_primary: false,
              summary:
                "* Spearheaded the development of merchant, admin, and customer dashboards that\n* contributed to $20M+ in revenue growth by enhancing user onboarding flows and\n* improving feature accessibility.\n* Restructured the Kafene Admin Dashboard architecture over a 3-month period, cutting\n* development cycles from weeks to days and enabling faster, more consistent feature\n* rollouts.\n* Led frontend performance optimization initiatives across Nuxt-based apps, resulting in a\n* 30% increase in user retention and significantly better Lighthouse scores across core web\n* vitals.\n* Implemented new code review processes, improving overall codebase maintainability and\n* reducing post-deployment bugs by 25%.\n* Scaled frontend systems to reliably serve 30,000+ active users with 99.9% uptime,\n* ensuring platform reliability during peak demand periods.",
            },
            {
              company: {
                name: "enyata",
                size: "51-200",
                id: "j51Rq9usRB2BCYOSGkx3TQqbMIMY",
                founded: 2019,
                industry: "information technology and services",
                location: {
                  name: "toronto, ontario, canada",
                  locality: "toronto",
                  region: "ontario",
                  metro: null,
                  country: "canada",
                  continent: "north america",
                  street_address: null,
                  address_line_2: null,
                  postal_code: "m5j 2p1",
                  geo: "43.65,-79.39",
                },
                linkedin_url: "linkedin.com/company/enyata",
                linkedin_id: "14031965",
                facebook_url: null,
                twitter_url: null,
                website: "enyata.com",
                ticker: null,
                type: "private",
              },
              location_names: [],
              end_date: "2021-07",
              start_date: "2020-01",
              title: {
                name: "frontend developer",
                class: "research_and_development",
                role: "engineering",
                sub_role: null,
                levels: [],
              },
              is_primary: false,
              summary:
                "* As a Frontend Engineer at Enyata, I worked full-time on NIBSS (Nigeria Inter-Bank Settlement System) projects, delivering high-impact solutions for national-scale financial services.\n* Architected and developed a scalable frontend for the NIBSS Point of Sale application,\n* ensuring seamless compatibility across 20+ device types and 10+ browser versions,\n* expanding the app’s national reach.\n* Conducted extensive user feedback testing and revamped the UI/UX, leading to a 25%\n* increase in application completion rates for POS certifications.\n* Reduced average page load times by 50%, boosting application retention rates over a 6-\n* month window.\n* Collaborated directly with backend teams to streamline API integrations, improving data\n* flow efficiency and reducing frontend-to-backend communication latency.",
            },
            {
              company: {
                name: "enyata",
                size: "51-200",
                id: "j51Rq9usRB2BCYOSGkx3TQqbMIMY",
                founded: 2019,
                industry: "information technology and services",
                location: {
                  name: "toronto, ontario, canada",
                  locality: "toronto",
                  region: "ontario",
                  metro: null,
                  country: "canada",
                  continent: "north america",
                  street_address: null,
                  address_line_2: null,
                  postal_code: "m5j 2p1",
                  geo: "43.65,-79.39",
                },
                linkedin_url: "linkedin.com/company/enyata",
                linkedin_id: "14031965",
                facebook_url: null,
                twitter_url: null,
                website: "enyata.com",
                ticker: null,
                type: "private",
              },
              location_names: [],
              end_date: "2019-11",
              start_date: "2019-05",
              title: {
                name: "software engineer intern",
                class: "research_and_development",
                role: "engineering",
                sub_role: "software",
                levels: ["training"],
              },
              is_primary: false,
              summary:
                "* During my internship, I had the opportunity to work closely with engineering teams to build, test, and ship real-world features while learning how scalable applications are developed in production environments. I gained hands-on experience in:\n* Navigating large codebases and working with Git for version control\n* Collaborating in an Agile team using tools like JIRA and Trello\n* Translating Figma/Adobe XD designs into responsive, accessible UIs\n* Debugging and optimizing web components for performance\n* Writing clean, maintainable code using JavaScript, HTML, CSS, and modern frameworks like React and Vue\n* In addition to technical development, I also:\n* Participated in daily standups, sprint planning, and code reviews\n* Collaborated with designers, backend engineers, and QA teams\n* Received mentorship on best practices in frontend architecture and performance\n* Delivered small features end-to-end, gaining confidence in deploying to live environments",
            },
          ],
          email: "",
          linkdIn_profile: "linkedin.com/in/cynthia-ilojeme",
          phone_number: "",
          summary:
            "* Rebuilt a critical healthcare dashboard from scratch, improving operational tracking\n* speed by 35%.\n* Integrated real-time document notarization using Agora and Firebase for Tonote, scaling\n* the platform to process thousands of secure transactions monthly, significantly boosting\n* client trust and platform adoption.\n* Designed and launched internal component libraries and UI kits, reducing new project\n* setup time by 30% and standardizing visual consistency across multiple products.\n* Introduced frontend performance benchmarks and enforced best practices through critical code reviews, resulting in a 20% improvement in page load speeds across major projects.",
          current_company: "enyata",
          education: "",
          skills: [
            "analytical skills",
            "application programming interfaces",
            "cascading style sheets",
            "code review",
            "collaborative problem solving",
            "communication",
            "css3",
            "engineering",
            "engineering management",
            "front end development",
            "git",
            "github",
            "graphql",
            "html",
            "html5",
            "javascript",
            "jest",
            "jira",
            "leadership",
            "node.js",
            "object oriented programming",
            "react.js",
            "redux.js",
            "representational state transfer",
            "research",
            "responsive web design",
            "rest apis",
            "scss",
            "software",
            "software development",
            "storybook",
            "storybooks",
            "strategic communications",
            "team leadership",
            "team management",
            "teamwork",
            "trello",
            "typescript",
            "unit testing",
            "user interface design",
            "volunteering",
            "vue.js",
            "web application development",
            "web development",
          ],
        },
        {
          name: "ojakovo eric",
          role: "senior frontend developer",
          country: "nigeria",
          years_of_expr: 7,
          experience: [
            {
              company: {
                name: "custodian investment plc",
                size: "501-1000",
                id: "CeW8Wt6FhuvAsDVZyelhmwS7XiEa",
                founded: 1995,
                industry: "financial services",
                location: {
                  name: "lagos, lagos, nigeria",
                  locality: "lagos",
                  region: "lagos",
                  metro: null,
                  country: "nigeria",
                  continent: "africa",
                  street_address: "16a commercial avenue sabo",
                  address_line_2: null,
                  postal_code: "yaba",
                  geo: "6.45,3.38",
                },
                linkedin_url:
                  "linkedin.com/company/custodian-&-allied-insurance",
                linkedin_id: "5897888",
                facebook_url: null,
                twitter_url: "twitter.com/custodianplc",
                website: "custodianplc.com.ng",
                ticker: null,
                type: "private",
              },
              location_names: [],
              end_date: null,
              start_date: "2022-11",
              title: {
                name: "senior frontend developer",
                class: "research_and_development",
                role: "engineering",
                sub_role: "web",
                levels: ["senior"],
              },
              is_primary: true,
              summary: null,
            },
            {
              company: {
                name: "wizer",
                size: "1-10",
                id: "uVnFg0FRpdPrEg1qFMsEvQJSvrF6",
                founded: null,
                industry: "computer software",
                location: null,
                linkedin_url: "linkedin.com/company/wizer1",
                linkedin_id: "70875545",
                facebook_url: null,
                twitter_url: null,
                website: null,
                ticker: null,
                type: "private",
              },
              location_names: [],
              end_date: "2022-03",
              start_date: "2018-03",
              title: {
                name: "product manager",
                class: "research_and_development",
                role: "product",
                sub_role: "product_management",
                levels: [],
              },
              is_primary: false,
              summary: null,
            },
            {
              company: {
                name: "beyond credit limited",
                size: "51-200",
                id: "N4aFvpTxI649rn7GIiKrBQdksjgS",
                founded: 2016,
                industry: "financial services",
                location: {
                  name: "ikeja, lagos, nigeria",
                  locality: "ikeja",
                  region: "lagos",
                  metro: null,
                  country: "nigeria",
                  continent: "africa",
                  street_address: null,
                  address_line_2: null,
                  postal_code: null,
                  geo: "6.6,3.35",
                },
                linkedin_url: "linkedin.com/company/beyondcredit",
                linkedin_id: "75588889",
                facebook_url: null,
                twitter_url: null,
                website: "beyondcredit.com.ng",
                ticker: null,
                type: "private",
              },
              location_names: [],
              end_date: "2018-02",
              start_date: "2018-02",
              title: {
                name: "area manager",
                class: "services",
                role: "professional_service",
                sub_role: "investment_banking",
                levels: ["manager"],
              },
              is_primary: false,
              summary: null,
            },
          ],
          email: "",
          linkdIn_profile: "linkedin.com/in/ojakovo-eric-298a0798",
          phone_number: "",
          summary: null,
          current_company: "custodian investment plc",
          education: "master of science",
          skills: [
            "business development",
            "business strategy",
            "customer service",
            "english",
            "leadership",
            "management",
            "marketing strategy",
            "microsoft excel",
            "microsoft office",
            "microsoft word",
            "negotiation",
            "powerpoint",
            "project management",
            "project planning",
            "public speaking",
            "research",
            "sales",
            "social media",
            "strategic planning",
            "team building",
            "team leadership",
            "teamwork",
            "training",
            "windows",
          ],
        },
        {
          name: "oluwatobi ishola",
          role: "senior backend software engineer",
          country: "nigeria",
          years_of_expr: 7,
          experience: [
            {
              company: {
                name: "innoscripta se",
                size: "201-500",
                id: "CfZG6mLF6cc8JbC0TL1rrgifOUom",
                founded: 2012,
                industry: "management consulting",
                location: {
                  name: "münchen, bavaria, germany",
                  locality: "münchen",
                  region: "bavaria",
                  metro: null,
                  country: "germany",
                  continent: "europe",
                  street_address: "60 arnulfstraße",
                  address_line_2: null,
                  postal_code: "80335",
                  geo: "48.15,11.57",
                },
                linkedin_url: "linkedin.com/company/innoscripta-se",
                linkedin_id: "7305216",
                facebook_url:
                  "facebook.com/innoscripta-karriere-1768502733471396",
                twitter_url: null,
                website: "innoscripta.com",
                ticker: null,
                type: "private",
              },
              location_names: ["munich, bavaria, germany"],
              end_date: null,
              start_date: "2024-11",
              title: {
                name: "senior backend software engineer",
                class: "research_and_development",
                role: "engineering",
                sub_role: "web",
                levels: ["senior"],
              },
              is_primary: true,
              summary: null,
            },
            {
              company: {
                name: "blaaiz",
                size: "11-50",
                id: "oKTT0pbzU8JedUBS5Im35gRA95j9",
                founded: 2023,
                industry: "financial services",
                location: {
                  name: "london, ontario, canada",
                  locality: "london",
                  region: "ontario",
                  metro: null,
                  country: "canada",
                  continent: "north america",
                  street_address: null,
                  address_line_2: null,
                  postal_code: null,
                  geo: "42.95,-81.24",
                },
                linkedin_url: "linkedin.com/company/blaaiz",
                linkedin_id: "96067404",
                facebook_url: null,
                twitter_url: "twitter.com/myblaaiz",
                website: "blaaiz.com",
                ticker: null,
                type: "private",
              },
              location_names: [],
              end_date: "2024-11",
              start_date: "2024-02",
              title: {
                name: "senior software engineer",
                class: "research_and_development",
                role: "engineering",
                sub_role: "software",
                levels: ["senior"],
              },
              is_primary: false,
              summary:
                "Integrated over 10+ financial providers (APIs) to facilitate transactions in over 16 currencies, expanding global reach.Engineered and optimized a complex data processing algorithm for the internal operations team system, reducing errors, improving employee efficiency, and increasing data accuracy.Developed a referral and milestone bonus module, and integrated scalable Push Notifications with Google Firebase to enhance user engagement by 45% and strengthen the product-user connection.Developed a comprehensive test suite using PHPUnit consisting of over 530 tests, 2300 assertions, and ensuring no regressions shipped, ensuring the robustness of new features and updates. Added automated testing processes within the pipeline, leading to a 50% reduction in deployment errors.Integrated with Metabase and wrote complex queries to provide valuable insight to business data for back office staff.Implemented a sophisticated internal fraud detection system to analyze user activities and transaction data, resulting in a 90% increase in fraud detection accuracy.Leveraged Sentry for comprehensive system monitoring and error tracking, while utilizing AWS CloudWatch to analyze logs and create custom metric reports, reducing application errors, aiding faster debugging & incident response times, as well as data-driven insights that improved infrastructure performance.",
            },
            {
              company: {
                name: "dipolediamond",
                size: "11-50",
                id: "k2UBu8PBCDbnFnSg3rS6DwyMQf3r",
                founded: 2015,
                industry: "information technology and services",
                location: {
                  name: "niagara falls, ontario, canada",
                  locality: "niagara falls",
                  region: "ontario",
                  metro: null,
                  country: "canada",
                  continent: "north america",
                  street_address: "4551 zimmerman avenue",
                  address_line_2: null,
                  postal_code: "l2e 3m5",
                  geo: "43.10,-79.10",
                },
                linkedin_url: "linkedin.com/company/dipolediamond",
                linkedin_id: "2672610",
                facebook_url: "facebook.com/dipolediamond",
                twitter_url: "twitter.com/dipolediamond",
                website: "dipolediamond.com",
                ticker: null,
                type: "private",
              },
              location_names: [],
              end_date: "2024-07",
              start_date: "2023-01",
              title: {
                name: "practice lead, senior php developer | laravel | c# | node.js | vue.js",
                class: "research_and_development",
                role: "engineering",
                sub_role: null,
                levels: ["senior", "manager"],
              },
              is_primary: false,
              summary:
                "Promoted to the role of Senior Analyst and Practice Lead for Engineering. My expertise encompasses and is not limited to PHP Laravel, C#, Node.js, and Vue.js, and my professional journey has been marked by a rich tapestry of successful projects and some leadership experiences.Leading a cross-functional team in the management of the Intelligent Digital Assistant Chatbot for a leading Nigerian bank's Contact Center. This involved a substantial overhaul, transitioning the codebases from Node.js/C# to a more optimized Laravel and C# structure, implementing efficient CI/CD pipelines, and integrating OpenAI for enhanced functionality.Beyond project development, I am deeply committed to knowledge transfer within the team. I oversee some of our managed services with clients, emphasizing a collaborative and client-focused approach.I set up individual development environments for all our corporate training. Mentoring team members is at the core of my leadership philosophy. I lead by example, emphasizing the significance of both personal and collective growth.I played a key role in the development of an MVP for a ProcessMaker Reporting Tool, utilizing Power BI, Power Query, and M language. This project aimed to enhance reporting capabilities within ProcessMaker.In addition to my leadership responsibilities, I actively participate in Code reviews, User Acceptance Testing (UAT) sessions, Quality Assurance Testing (QAT) sessions, and deployment sessions, both internally and externally. I prioritize comprehensive documentation, creating Project Definition Documents (PDDs) and Software Design Documents (SDDs). Over the years, my contributions have not only been technical but have also been a source of income to the organization. I am passionate about the intersection of technical excellence and business impact.",
            },
            {
              company: {
                name: "buckstrybe",
                size: "1-10",
                id: "fmYU9uKjxi8kkBr9BVGcLw4uOQJE",
                founded: 2022,
                industry: "financial services",
                location: {
                  name: "lagos, lagos, nigeria",
                  locality: "lagos",
                  region: "lagos",
                  metro: null,
                  country: "nigeria",
                  continent: "africa",
                  street_address: null,
                  address_line_2: null,
                  postal_code: "100001",
                  geo: "6.45,3.38",
                },
                linkedin_url: "linkedin.com/company/buckstrybe",
                linkedin_id: "82980165",
                facebook_url: "facebook.com/buckstrybe",
                twitter_url: "twitter.com/buckstrybe",
                website: "buckstrybe.com",
                ticker: null,
                type: "private",
              },
              location_names: ["nottingham, england, united kingdom"],
              end_date: "2024-09",
              start_date: "2022-03",
              title: {
                name: "lead software engineer",
                class: "research_and_development",
                role: "engineering",
                sub_role: "software",
                levels: ["manager"],
              },
              is_primary: false,
              summary:
                "As a Senior PHP Laravel Developer, I played a pivotal role in not only delivering the MVP but also driving the continuous evolution of our product through the addition of key features. My strategic contributions have been instrumental in shaping the product's trajectory and enhancing its market appeal.- Applied atomic locks on high-volume transaction endpoints to prevent race conditions and double-spending, resulting in a 99.9% transaction success rate.- Designed and implemented a high-performance schema optimized for tracking financial transactions, improving reconciliation speed by 40% and enabling real-time balance calculations for over 300 daily transactions.- Enhanced system performance by implementing strategic caching (Redis), efficient scheduling (cron jobs), and background task processing (queues), reducing API response times by 60%.- Developed over 600 RESTful APIs for frontend integration, enabling seamless operations across various platforms. Developed a robust push notification module that increased product-user engagement, and facilitated in-direct communication to product users.- Created a robust logging and monitoring system with Laravel's built-in tools and Sentry, cutting down bug resolution time by 40% and maintaining 99% application uptime.My role extends beyond coding – it involves actively shaping the product's architecture, optimizing performance, and implementing robust security measures.",
            },
            {
              company: {
                name: "fofx academy",
                size: "1-10",
                id: "tToZrilRBwrDUCCpuePengB2yI0e",
                founded: 2018,
                industry: "professional training & coaching",
                location: {
                  name: "lagos, lagos, nigeria",
                  locality: "lagos",
                  region: "lagos",
                  metro: null,
                  country: "nigeria",
                  continent: "africa",
                  street_address: "1 ayodele okeowo street",
                  address_line_2: null,
                  postal_code: "23401",
                  geo: "6.45,3.38",
                },
                linkedin_url: "linkedin.com/company/fofxacademy",
                linkedin_id: "12646512",
                facebook_url: null,
                twitter_url: null,
                website: "fofxacademy.com",
                ticker: null,
                type: "private",
              },
              location_names: [],
              end_date: "2020-12",
              start_date: "2019-10",
              title: {
                name: "programs facilitator and instructor | javascript, php",
                class: "research_and_development",
                role: "engineering",
                sub_role: "web",
                levels: [],
              },
              is_primary: false,
              summary:
                "I played a pivotal role in shaping the educational landscape and fostering student success. I not only designed and delivered dynamic curricula (in collaboration), resulting in a 25% improvement in student engagement and comprehension, but I also initiated technological innovations to streamline administrative processes.I provided mentorship and support to over 30 students, leading to a 20% increase in graduation rates compared to previous cohorts. My commitment to fostering an inclusive learning environment was reflected in the rise in overall student satisfaction scores.I developed a sophisticated Cohort Management Application using Laravel and Vue.js, automating cohort management processes and enhancing overall program efficiency. This bespoke application contributed to a 20% reduction in administrative overhead, allowing more focus on personalized student support and program improvement initiatives.Additionally, recognizing the need for efficient attendance tracking, I took the initiative to create a desktop application using Electron. This attendance app not only ensured accurate and timely attendance records but also facilitated a 15% reduction in manual data entry errors.As part of the leadership team, I actively collaborated with colleagues to identify opportunities for program enhancement. Through strategic initiatives, we achieved a 30% reduction in dropout rates and a 60% increase in post-program placement rates, showcasing my dedication to continuous improvement.Facilitating educational programs and workshops, I leveraged my expertise not only in JavaScript and PHP Laravel to equip students with practical skills. This resulted in a 60% growth in the number of students securing internships and employment within three months of program completion.I am proud of my contributions to the success of the programs under my purview, and I look forward to bringing this track record of achievement and dedication to a new challenge.",
            },
            {
              company: {
                name: "dipolediamond",
                size: "11-50",
                id: "k2UBu8PBCDbnFnSg3rS6DwyMQf3r",
                founded: 2015,
                industry: "information technology and services",
                location: {
                  name: "niagara falls, ontario, canada",
                  locality: "niagara falls",
                  region: "ontario",
                  metro: null,
                  country: "canada",
                  continent: "north america",
                  street_address: "4551 zimmerman avenue",
                  address_line_2: null,
                  postal_code: "l2e 3m5",
                  geo: "43.10,-79.10",
                },
                linkedin_url: "linkedin.com/company/dipolediamond",
                linkedin_id: "2672610",
                facebook_url: "facebook.com/dipolediamond",
                twitter_url: "twitter.com/dipolediamond",
                website: "dipolediamond.com",
                ticker: null,
                type: "private",
              },
              location_names: [],
              end_date: "2023-01",
              start_date: "2019-09",
              title: {
                name: "php developer - php laravel | c# | node js",
                class: "research_and_development",
                role: "engineering",
                sub_role: null,
                levels: [],
              },
              is_primary: false,
              summary:
                "In my role as a PHP Developer, I not only secured a permanent position but also proved to be a valuable team player. I actively participated in client projects and constructing internal solutions. I excelled in problem-solving, played a key role in facilitating corporate training, contributed significantly to documentation efforts, and conducted thorough code reviews, among other responsibilities.",
            },
            {
              company: {
                name: "dipolediamond",
                size: "11-50",
                id: "k2UBu8PBCDbnFnSg3rS6DwyMQf3r",
                founded: 2015,
                industry: "information technology and services",
                location: {
                  name: "niagara falls, ontario, canada",
                  locality: "niagara falls",
                  region: "ontario",
                  metro: null,
                  country: "canada",
                  continent: "north america",
                  street_address: "4551 zimmerman avenue",
                  address_line_2: null,
                  postal_code: "l2e 3m5",
                  geo: "43.10,-79.10",
                },
                linkedin_url: "linkedin.com/company/dipolediamond",
                linkedin_id: "2672610",
                facebook_url: "facebook.com/dipolediamond",
                twitter_url: "twitter.com/dipolediamond",
                website: "dipolediamond.com",
                ticker: null,
                type: "private",
              },
              location_names: [],
              end_date: "2019-09",
              start_date: "2019-05",
              title: {
                name: "software developer - php laravel | c# | js",
                class: "research_and_development",
                role: "engineering",
                sub_role: null,
                levels: [],
              },
              is_primary: false,
              summary:
                "As a Software Developer Intern, I embarked on a dynamic learning journey where I not only honed my existing skills but also eagerly embraced new technologies. I had the privilege of engaging in a wide-ranging experience. Beyond exploring new technologies such as Vue, Svelte, Laravel, processMaker, UiPath, and others, I actively participated in client projects. Additionally, I was responsible for constructing internal solutions, enriching my practical understanding of software development and its real-world applications.",
            },
            {
              company: {
                name: "tech electron",
                size: null,
                id: null,
                founded: null,
                industry: null,
                location: null,
                linkedin_url: null,
                linkedin_id: null,
                facebook_url: null,
                twitter_url: null,
                website: null,
                ticker: null,
                type: null,
              },
              location_names: ["abeokuta, ogun, nigeria"],
              end_date: "2018-11",
              start_date: "2018-04",
              title: {
                name: "php web developer",
                class: "research_and_development",
                role: "engineering",
                sub_role: null,
                levels: [],
              },
              is_primary: false,
              summary:
                "During my Web Developer Internship, I focused on learning and applying HTML, CSS, and JavaScript skills. I created web page structures, styled them, and added interactivity with JavaScript. I also tackled issues like browser compatibility and worked collaboratively on various projects while maintaining thorough documentation. Continuous learning and adapting to the evolving web development landscape were essential aspects of my experience.",
            },
          ],
          email: "",
          linkdIn_profile: "linkedin.com/in/ishola-oluwatobi",
          phone_number: "",
          summary: null,
          current_company: "innoscripta se",
          education: "",
          skills: [
            ".net framework",
            "agile methodologies",
            "amazon web services",
            "angularjs",
            "api development",
            "api development and integration",
            "architectural design",
            "bootstrap",
            "bulma",
            "business process automation",
            "c#",
            "cascading style sheets",
            "cloud computing",
            "community development",
            "computer science",
            "cross functional team leadership",
            "databases",
            "design patterns",
            "digitalocean",
            "docker",
            "front end development",
            "full stack development",
            "git",
            "github",
            "html",
            "html5",
            "java",
            "javascript",
            "javase",
            "jquery",
            "laravel",
            "linux",
            "microservices",
            "microsoft office",
            "model view controller",
            "motivational speaking",
            "mysql",
            "mysqli",
            "node.js",
            "notepad++",
            "nuxt.js",
            "object oriented programming",
            "payment systems",
            "pdo",
            "php",
            "php applications",
            "php frameworks",
            "phpmyadmin",
            "postgresql",
            "process maker",
            "programming",
            "public speaking",
            "react",
            "react.js",
            "redis",
            "rest apis",
            "robotic process automation",
            "sass",
            "security",
            "software engineering practices",
            "software solution architecture",
            "solid design principles",
            "solution architecture",
            "sql",
            "sublime text",
            "systems design",
            "team leadership",
            "team motivation",
            "teamwork",
            "technical leadership",
            "uipath",
            "unit testing",
            "vue",
            "vue js",
            "vue.js",
            "web application development",
            "web based software development",
            "web development",
            "windows",
            "wordpress",
          ],
        },
      ];
      // Filter and score mock candidates based on request
      let filtered = [...mockCandidates];

      if (data.specializations.length > 0) {
        filtered = filtered.map(c => {
          const matchedSkills = data.specializations.filter(skill =>
            c.skills.some(s => s.toLowerCase().includes(skill.toLowerCase()))
          );
          const skillMatchScore =
            (matchedSkills.length / data.specializations.length) * 20;
          return {
            ...c,
            //   overallScore: Math.min(
            //     100,
            //     Math.round(c.overallScore + skillMatchScore)
            //   ),
          };
        });
      }

      if (data.location && data.location !== "any") {
        filtered = filtered.filter(
          c =>
            c.country.toLowerCase().includes(data.location?.toLowerCase() || "")
          // ||  c.location.toLowerCase().includes(data.country.toLowerCase())
        );
      }

      // Sort by score by default
      // filtered.sort((a, b) => b.overallScore - a.overallScore);

      // Limit to requested count
      filtered = filtered.slice(0, data.number_of_candidates);
      return {
        success: true as const,
        data: mockCandidates,
      };
    }
    const response = await axiosInstance.post("sourcing/sourcing/", data);
    const candidates = response.data?.candidates as
      | ServerCandidate[]
      | undefined;
    if (candidates) {
      return {
        success: true as const,
        data: candidates,
      };
    } else {
      return {
        success: false as const,
        error: response.data?.message || "Failed to retrieve candidates",
      };
    }
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    console.log("sourcingSearch Error: ", errMsg);
    console.log("sourcingSearch Error Map: ", errorMap);
    return {
      success: false as const,
      error: errMsg,
    };
  }
};

export const addToPipeline = async (candidate: ServerCandidate) => {
  try {
    let data: any = candidate;
    // cleanup
    if (!candidate.education) {
      data = omit(candidate, "education");
    }
    const response = await axiosInstance.post(
      "sourcing/add-to-pipeline/",
      data
    );
    return {
      success: true as const,
      data: response.data.data as PipelineEntry,
    };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    console.log("addToPipeline Error: ", errMsg);
    console.log("addToPipeline Error Map: ", errorMap);
    return {
      success: false as const,
      error: errMsg,
    };
  }
};

export const bulkAddToPipeline = async (candidates: ServerCandidate[]) => {
  try {
    // Clean up each candidate
    const cleanedCandidates = candidates.map(candidate => {
      let data: any = candidate;
      if (!candidate.education) {
        data = omit(candidate, "education");
      }
      return data;
    });

    const response = await axiosInstance.post(
      "sourcing/add-to-pipeline/",
      JSON.parse(
        JSON.stringify({
          candidates: cleanedCandidates,
        })
      )
    );
    console.log(response.data);
    return {
      success: true as const,
      data: response.data.data as PipelineEntry[],
    };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    console.log("bulkAddToPipeline Error: ", errMsg);
    console.log("bulkAddToPipeline Error Map: ", errorMap);
    return {
      success: false as const,
      error: errMsg,
    };
  }
};

export const deletePipelineEntry = async (id: ID) => {
  try {
    const response = await axiosInstance.delete<{ message: string }>(
      `sourcing/remove-from-pipeline/${id}/`
    );
    return {
      success: true as const,
      data: response.data,
    };
  } catch (error) {
    const [errMsg, errorMap] = await _handleServerApiCallError(error);
    console.log("deletePipelineEntry Error: ", errMsg);
    console.log("deletePipelineEntry Error Map: ", errorMap);
    return {
      success: false as const,
      error: errMsg,
    };
  }
};

export const getPipeline = async (categoryId?: string) => {
  const url = categoryId
    ? `sourcing/pipeline/?category=${categoryId}`
    : "sourcing/pipeline/";
  const data = await serverKyInstance
    .get<GetPipelineResponse>(url)
    .json();
  return data;
};

export const getCategories = async () => {
  const data = await serverKyInstance
    .get<PipelineCategory[]>("sourcing/categories/")
    .json();
  return data;
};

export const createCategory = async (name: string, description: string) => {
  try {
    const response = await axiosInstance.post("sourcing/categories/", {
      name,
      description,
    });
    return { success: true as const, data: response.data as PipelineCategory };
  } catch (error) {
    const [errMsg] = await _handleServerApiCallError(error);
    return { success: false as const, error: errMsg };
  }
};

export const updateCategory = async (
  id: ID,
  data: Partial<Pick<PipelineCategory, "name" | "description" | "is_active">>
) => {
  try {
    const response = await axiosInstance.patch(`sourcing/categories/${id}/`, data);
    return { success: true as const, data: response.data as PipelineCategory };
  } catch (error) {
    const [errMsg] = await _handleServerApiCallError(error);
    return { success: false as const, error: errMsg };
  }
};

export const deleteCategory = async (id: ID) => {
  try {
    await axiosInstance.delete(`sourcing/categories/${id}/`);
    return { success: true as const };
  } catch (error) {
    const [errMsg] = await _handleServerApiCallError(error);
    return { success: false as const, error: errMsg };
  }
};

export const updatePipelineEntry = async (
  id: ID,
  data: { status?: string; category?: number | null }
) => {
  try {
    const response = await axiosInstance.patch(`sourcing/pipeline/${id}/`, data);
    return { success: true as const, data: response.data as PipelineEntry };
  } catch (error) {
    const [errMsg] = await _handleServerApiCallError(error);
    return { success: false as const, error: errMsg };
  }
};

export const validateInviteToken = async (token: string) => {
  try {
    const res = await publicAxiosInstance.get(`sourcing/invite/${token}/`);
    return { success: true as const, data: res.data as { category_name: string; company_name: string; is_active: boolean } };
  } catch (error) {
    const [errMsg] = await _handleServerApiCallError(error);
    return { success: false as const, error: errMsg };
  }
};

export const submitInviteApplication = async (token: string, data: FormData) => {
  try {
    const res = await axiosInstance.post(`sourcing/invite/${token}/submit/`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return { success: true as const, data: res.data };
  } catch (error) {
    const [errMsg] = await _handleServerApiCallError(error);
    return { success: false as const, error: errMsg };
  }
};

export const generateInviteLink = async (categoryId: ID) => {
  try {
    const res = await axiosInstance.post(`sourcing/categories/${categoryId}/invite-link/`);
    return { success: true as const, data: res.data.data as { id: number; token: string; invite_url: string; category_name: string; is_active: boolean } };
  } catch (error) {
    const [errMsg] = await _handleServerApiCallError(error);
    return { success: false as const, error: errMsg };
  }
};
