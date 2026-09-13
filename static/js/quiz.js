console.log("QUIZ.JS LOADED");
const SUPABASE_URL = "https://agyejnzrvucglgqqhlzv.supabase.co";
const SUPABASE_KEY = "sb_publishable_UDf_B-K_mE73MwHZmWNofw_1jTuF3fS";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

document.querySelectorAll(".quiz").forEach((quiz) => {

    const allQuestions =
        Array.from(quiz.querySelectorAll(".quiz-question"));

        for (let i = allQuestions.length - 1; i > 0; i--) {

        const j =
            Math.floor(Math.random() * (i + 1));

        [allQuestions[i], allQuestions[j]] =
            [allQuestions[j], allQuestions[i]];

    }

    const selectedQuestions =
        allQuestions.slice(0, 10);

    console.log("QUIZ TEST:", allQuestions.length, selectedQuestions.length);
    console.log("Total questions:", allQuestions.length);
    console.log("Selected questions:", selectedQuestions.length);


    allQuestions.forEach((question) => {
        if (!selectedQuestions.includes(question)) {
            question.remove();
        }
        
    });

    console.log("Questions remaining after removal:", quiz.querySelectorAll(".quiz-question").length);
    console.log("Number of .quiz elements:", document.querySelectorAll(".quiz").length);
    console.log("Quiz question elements:", quiz.querySelectorAll(".quiz-question"));

    const questions =
        quiz.querySelectorAll(".quiz-question");

    for (const [index, question] of questions.entries()) {

        const number =
            question.querySelector(".quiz-number");

        if (number) {
            number.textContent =
                `${index + 1}. `;
        }

    }
    
    const submitButton = quiz.querySelector(".quiz-submit");
    const result = quiz.querySelector(".quiz-result");

    questions.forEach((question) => {

        const options = question.querySelectorAll(".quiz-option");

        options.forEach((option) => {

            option.addEventListener("click", () => {

                options.forEach((button) => {
                    button.classList.remove("selected");
                });

                option.classList.add("selected");

            });

        });

    });

    submitButton.addEventListener("click", async () => {

        // Check that every question has been answered
        const unansweredQuestions = [];

        for (const [index, question] of questions.entries()) {

            const selected =
                question.querySelector(
                    ".quiz-option.selected"
                );

            if (!selected) {
                unansweredQuestions.push(index + 1);
            }

        }

        // Stop here if any questions are unanswered
        if (unansweredQuestions.length > 0) {

            result.textContent =
                `Please answer question${unansweredQuestions.length > 1 ? "s" : ""} ` +
                `${unansweredQuestions.join(", ")} before submitting.`;

            return;
        }

        // All questions have been answered
        let score = 0;
        const answers = [];
        const recommendations = [];

        questions.forEach((question) => {

            const selected = question.querySelector(
                ".quiz-option.selected"
            );

            const questionId = question.dataset.questionId;
            const correct = selected.dataset.correct === "true";

            if (correct) {

                score++;
                selected.classList.add("correct");

            } else {

                selected.classList.add("incorrect");

                // Highlight the correct answer
                const correctOption = question.querySelector(
                    '.quiz-option[data-correct="true"]'
                );

                if (correctOption) {
                    correctOption.classList.add("correct");
                }

                // Collect recommendation for missed question
                const recommendationTitle =
                    question.dataset.recommendationTitle;

                const recommendationDescription =
                    question.dataset.recommendationDescription;

                const recommendationUrl =
                    question.dataset.recommendationUrl;

                if (recommendationTitle && recommendationUrl) {

                    // Check whether this recommendation has
                    // already been added for another missed question.
                    const alreadyRecommended = recommendations.some(
                        (recommendation) =>
                            recommendation.url === recommendationUrl
                    );

                    // Only add the recommendation if it is new.
                    if (!alreadyRecommended) {

                        recommendations.push({
                            title: recommendationTitle,
                            description: recommendationDescription,
                            url: recommendationUrl,
                            priority: Number(question.dataset.recommendationPriority) || 999
                        });

                    }
                }
            }

            // Save the answer for this question
            answers.push({
                question_id: questionId,
                correct: correct
            });

        });

        const quizId = quiz.dataset.quizId;

        // Get the currently logged-in user, if there is one.
        const {
            data: { user }
        } = await supabaseClient.auth.getUser();

        // Generate the ID that will connect this attempt
        // to all of its individual answers.
        const attemptId = crypto.randomUUID();

        // Save the overall quiz attempt
        const { error: attemptError } = await supabaseClient
            .from("quiz_attempts")
            .insert({
                id: attemptId,
                quiz_id: quizId,
                score: score,
                total_questions: questions.length,
                user_id: user ? user.id : null
            });

        if (attemptError) {

            console.error(
                "Error saving quiz attempt:",
                attemptError
            );

            result.textContent =
            attemptError.message;
                // "There was a problem saving your results.";

            return;
        }

        // Add the attempt ID to every individual answer
        const answerRows = answers.map((answer) => ({
            attempt_id: attemptId,
            question_id: answer.question_id,
            correct: answer.correct
        }));

        // Save the individual answers
        const { error: answerError } = await supabaseClient
            .from("quiz_answers")
            .insert(answerRows);

        if (answerError) {

            console.error(
                "Error saving quiz answers:",
                answerError
            );

            result.textContent =
                answerError.message;
                // "Your score was calculated, but there was a problem saving your answers.";

            return;
        }

        // Display the score
        result.textContent =
            `You scored ${score} out of ${questions.length}.`;

        const downloadButton =
            document.createElement("button");

        downloadButton.textContent =
            "Download Results";

        downloadButton.classList.add("quiz-download");

            result.appendChild(downloadButton);

            function loadImageAsDataURL(src) {

                return new Promise((resolve, reject) => {

                    const image = new Image();

                    image.onload = () => {

                        const canvas =
                            document.createElement("canvas");

                        canvas.width = image.naturalWidth;
                        canvas.height = image.naturalHeight;

                        const context =
                            canvas.getContext("2d");

                        context.drawImage(
                            image,
                            0,
                            0
                        );
                        
                        resolve({
                            data: canvas.toDataURL("image/png"),
                            width: image.naturalWidth,
                            height: image.naturalHeight
                        });

                        // resolve(
                        //     canvas.toDataURL("image/png")
                        // );

                    };

                    image.onerror = reject;

                    image.src = src;

                });

            }

            downloadButton.addEventListener("click", async () => {

                const { jsPDF } = window.jspdf;

                const doc = new jsPDF();
                
                const logo =
                    await loadImageAsDataURL(
                        "/img/logo/bqi_logo.png"
                    );

                // BQI logo
                const logoWidth = 100;

                const logoHeight =
                    logo.height / logo.width * logoWidth;

                doc.addImage(
                    logo.data,
                    "PNG",
                    20,
                    12,
                    logoWidth,
                    logoHeight
                );

                let y = 12 + logoHeight + 10;

                // Quiz title
                doc.setFontSize(18);
                doc.setTextColor(215, 35, 35);
                doc.text("BQI Quiz Results", 20, y);

                y += 4;

                doc.setDrawColor(215, 35, 35);
                doc.setLineWidth(0.5);
                doc.line(20, y, 190, y);

                y += 10;

                doc.setTextColor(0, 0, 0);

                // Score
                doc.setFontSize(12);
                doc.text(
                    `Score: ${score} out of ${questions.length}`,
                    20,
                    y
                );

                y += 8;

                // Date completed
                doc.text(
                    `Completed: ${new Date().toLocaleString()}`,
                    20,
                    y
                );

                y += 15;
                
                // Questions
                for (const [index, question] of questions.entries()) {
                // questions.forEach((question, index) => {

                    const questionText =
                        question.querySelector("h3").textContent.trim();

                    const questionImage =
                        question.querySelector(".quiz-question-image");
                    
                    const questionDataset =
                        question.querySelector(".quiz-dataset");

                    const selected =
                        question.querySelector(".quiz-option.selected");

                    const correctOption =
                        question.querySelector(
                            '.quiz-option[data-correct="true"]'
                        );

                    const selectedAnswer =
                        selected ? selected.textContent.trim() : "";

                    const correctAnswer =
                        correctOption ? correctOption.textContent.trim() : "";

                    const isCorrect =
                        selected &&
                        selected.dataset.correct === "true";

                    // Estimate space needed for the question
                    const questionLines =
                        doc.splitTextToSize(questionText, 170);

                    const selectedLines =
                        doc.splitTextToSize(
                            `Your answer: ${selectedAnswer}`,
                            170
                        );

                    const correctLines =
                        doc.splitTextToSize(
                            `Correct answer: ${correctAnswer}`,
                            170
                        );

                    // Start a new page if necessary
                    if (y + 10 > 270) {
                        doc.addPage();
                        y = 20;
                    }

                    // Question
                    doc.setFontSize(12);
                    doc.setFont(undefined, "bold");

                    questionLines.forEach((line) => {
                        doc.text(line, 20, y);
                        y += 6;
                    });

                    doc.setFont(undefined, "normal");

                    // Question image
                    if (questionImage) {

                        const imageData =
                            await loadImageAsDataURL(
                                questionImage.src
                            );

                        const maxWidth = 160;
                        const maxHeight = 80;

                        let imageWidth = imageData.width;
                        let imageHeight = imageData.height;

                        const scale =
                            Math.min(
                                maxWidth / imageWidth,
                                maxHeight / imageHeight,
                                1
                            );

                        imageWidth *= scale;
                        imageHeight *= scale;

                        if (y + imageHeight > 270) {
                            doc.addPage();
                            y = 20;
                        }

                        doc.addImage(
                            imageData.data,
                            "PNG",
                            20,
                            y,
                            imageWidth,
                            imageHeight
                        );

                        y += imageHeight + 8;
                    }
                    
                    if (questionDataset) {

                        const datasetText =
                            questionDataset.textContent.trim();

                        const datasetLines =
                            doc.splitTextToSize(datasetText, 160);

                        if (y + datasetLines.length * 6 + 5 > 270) {
                            doc.addPage();
                            y = 20;
                        }

                        doc.setFontSize(12);
                        doc.setFont(undefined, "normal");

                        y += 2;

                        datasetLines.forEach((line) => {
                            doc.text(line, 25, y);
                            y += 6;
                        });

                        y += 4;
                    }

                    // User answer
                    selectedLines.forEach((line) => {
                        doc.text(line, 25, y);
                        y += 6;
                    });

                    // Correct answer
                    correctLines.forEach((line) => {
                        doc.text(line, 25, y);
                        y += 6;
                    });
                    
                    // Status
                    doc.setTextColor(0, 0, 0);
                    doc.text("Result: ", 25, y);

                    const resultLabel = isCorrect ? "Correct" : "Incorrect";

                    doc.setTextColor(
                        isCorrect ? 0 : 215,
                        isCorrect ? 150 : 35,
                        isCorrect ? 0 : 35
                    );

                    doc.text(resultLabel, 25 + doc.getTextWidth("Result: "), y);

                    doc.setTextColor(0, 0, 0);

                    y += 10;

                }

                // Recommendations
                if (score >= 8) {

                    recommendations.push({
                        title: "High score special recommendation",
                        description: "Based on your score, we recommend you check out ",
                        url: "https://themathmatters.substack.com/...",
                        priority: 0
                    });

                }

                if (recommendations.length > 0) {

                    if (y + 15 > 270) {
                        doc.addPage();
                        y = 20;
                    }
                    
                    doc.setFontSize(18);
                    doc.setFont(undefined, "normal");
                    doc.setTextColor(215, 35, 35);

                    doc.text(
                        "Recommended Next Steps",
                        20,
                        y
                    );

                    y += 4;

                    doc.setDrawColor(215, 35, 35);
                    doc.setLineWidth(0.5);
                    doc.line(20, y, 190, y);

                    y += 10;

                    doc.setTextColor(0, 0, 0);

                    doc.setFontSize(11);
                    doc.setFont(undefined, "normal");

                    recommendations
                        .sort((a, b) => a.priority - b.priority)
                        .forEach((recommendation) => {

                            if (y + 15 > 270) {
                                doc.addPage();
                                y = 20;
                            }

                            const titleLines =
                                doc.splitTextToSize(
                                    recommendation.title,
                                    170
                                );

                            const descriptionLines =
                                doc.splitTextToSize(
                                    recommendation.description,
                                    165
                                );

                            doc.setFont(undefined, "bold");

                            titleLines.forEach((line) => {
                                doc.text(line, 20, y);
                                y += 6;
                            });

                            doc.setFont(undefined, "normal");
                            
                            descriptionLines.forEach((line, index) => {
                                if (index === 0) {
                                    doc.text("•", 25, y);
                                    doc.text(line, 30, y);
                                } else {
                                    doc.text(line, 30, y);
                                }

                                y += 5;
                            });

                            doc.text(
                                "•",
                                25,
                                y
                            );

                            doc.text(
                                recommendation.url,
                                30,
                                y
                            );

                            y += 10;

                        });
                }

                doc.save("BQI-quiz-results.pdf");

            });

        // Display recommendations
        if (recommendations.length > 0) {

            const recommendationHeading =
                document.createElement("p");

            recommendationHeading.textContent =
                "Recommended next steps:";

            result.appendChild(recommendationHeading);

            const recommendationList =
                document.createElement("ul");

            recommendations.sort(
                (a, b) => a.priority - b.priority
            );

            recommendations.forEach((recommendation) => {

                const listItem =
                    document.createElement("li");

                const link =
                    document.createElement("a");

                link.href = recommendation.url;
                link.textContent = recommendation.title;

                const description =
                    document.createElement("p");

                description.textContent =
                    recommendation.description;

                listItem.appendChild(link);
                listItem.appendChild(description);

                recommendationList.appendChild(listItem);

            });

            result.appendChild(recommendationList);

        } else {

            const successMessage =
                document.createElement("p");

            successMessage.textContent =
                "Excellent work! Based on your score, we recommend you checkout the following essays.";

            result.appendChild(successMessage);

            const specialRecommendations = [
                {
                    title: "Network Analysis",
                    description: "This FREE essay presents a novel approach to SPC called network.",
                    url: "https://store.brokenquality.com/b/network-analysis"
                },
                {
                    title: "The Needle & the Cannula",
                    description: "This FREE essay is a case study in the application of a novel SPC methodology called network analysis.",
                    url: "https://store.brokenquality.com/b/need-cannula-case-study"
                },
                {
                    title: "The Taguchi loss function",
                    description: "This FREE essay presents the case for replacing the adherance to specification economic model of loss due to poor quality with the Taguchi loss function.",
                    url: "https://store.brokenquality.com/b/taguchi-loss-function"
                }
            ];

            const recommendationList =
                document.createElement("ul");

            specialRecommendations.forEach((recommendation) => {

                const listItem =
                    document.createElement("li");

                const link =
                    document.createElement("a");

                link.href = recommendation.url;
                link.textContent = recommendation.title;

                const description =
                    document.createElement("p");

                description.textContent =
                    recommendation.description;

                listItem.appendChild(link);
                listItem.appendChild(description);

                recommendationList.appendChild(listItem);

            });

            result.appendChild(recommendationList);
        }

        // } else {

        //     const successMessage =
        //         document.createElement("p");

        //     successMessage.textContent =
        //         "Excellent work! Based on your score, the following essays discussing more advanced topics are recommended.";

        //     result.appendChild(successMessage);
        // }

        // Prevent duplicate submissions
        submitButton.disabled = true;

    });

});