import React, { useContext, useEffect, useState } from "react";
import moment from "moment";
import ErrorMessage from "./ErrorMessage";
import LeadModal from "./LeadModal";
import { UserContext } from "../context/UserContext";

const Table = () => {
  const [token] = useContext(UserContext);
  const [exams, setExams] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [activeModal, setActiveModal] = useState(false);
  const [id, setId] = useState(null);

  const handleUpdate = async (id) => {
    setId(id);
    setActiveModal(true);
  };

  const handleDelete = async (id) => {
    const requestOptions = {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    };
    const response = await fetch(`http://localhost:8000/exam/${id}`, requestOptions);
    if (!response.ok) {
      setErrorMessage("Failed to delete exam");
    }

    getExams();
  };

 const getExams = async () => {
  const requestOptions = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
  };

  try {
    const response = await fetch("http://localhost:8000/exams", requestOptions);  // Fetch all exams
    if (!response.ok) {
      setErrorMessage("Something went wrong. Couldn't load the exams");
      return;
    }
    const data =  await response.json();  // Await the parsed JSON response
    if (Array.isArray(data)) {
      setExams(data);  // Set exams if the data is an array
    } else {
      setExams([]);  // Ensure exams is an array, even if the API returns something unexpected
    }
    setLoaded(true);  // Mark as loaded after successful fetch
    setErrorMessage("");  // Clear error message if successful
  } catch (error) {
    setErrorMessage("Failed to fetch exams. Please try again later.");
  }
};

  useEffect(() => {
    getExams();
  }, []);  // Empty dependency array to fetch exams once on component mount

  const handleModal = () => {
    setActiveModal(!activeModal);
    getExams();
    setId(null);
  };

  return (
    <>
      <LeadModal
        active={activeModal}
        handleModal={handleModal}
        token={token}
        id={id}
        setErrorMessage={setErrorMessage}
      />
      <button
        className="button is-fullwidth mb-5 is-primary"
        onClick={() => setActiveModal(true)}
      >
        Create Exam
      </button>
      <ErrorMessage message={errorMessage} />
      {loaded && exams ? (
        <table className="table is-fullwidth">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {exams.map((exam) => (
                <tr key={exam.id}>
                  <td>{exam.id}</td>
                  <td>{exam.title}</td>
                  <td>{exam.description}</td>
                  <td>
                    <button
                        className="button mr-2 is-info is-light"
                        onClick={() => handleUpdate(exam.id)}
                    >
                      Update
                    </button>
                    <button
                        className="button mr-2 is-danger is-light"
                        onClick={() => handleDelete(exam.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Loading</p>
      )}
    </>
  );
};

export default Table;
