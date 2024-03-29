#include <Manager_Motor.h>
#include <Periph_Canbus.h>

#define MMOT_MOTOR_1_CAN_ID 1
#define MMOT_MOTOR_2_CAN_ID 2
#define MMOT_MOTOR_3_CAN_ID 3

// Error Codes
#define SET_ORIGINES_MOTORS_ERROR   -1
#define CAN_CONNECTION_MOTORS_ERROR -2

#define TIMER   10
#define MAX_TRY 50  // 500 ms before flagging an error

#define MOTOR_STEP   0.01
#define POSITION_TOL 0.02

typedef struct
{
    Motor motor;
    float nextPosition;
    float goalPosition;
    float kp;
    float kd;
    bool  detected;
    bool  goalReady;
} MotorControl;

typedef struct
{
    uint8_t state;
    int8_t  errorCode;
    bool    reset;
    bool    securityPass;

} managerMotor_t;

static uint8_t  tryCount = 0;
static uint32_t timerMs  = 0;

MotorControl motors[MMOT_MOTOR_NBR];
uint8_t      data[8];

managerMotor_t managerMotor;

// Prototypes
void ManagerMotor_ReceiveFromMotors();
void ManagerMotor_StartMotors();
void ManagerMotor_WaitingSecurity();
void ManagerMotor_SetOrigines();
void ManagerMotor_CalculateNextPositions();
void ManagerMotor_SendToMotors();

void   ManagerMotor_DisableMotors();
void   ManagerMotor_EnableMotors();
void   ManagerMotor_ResetMotors();
int8_t ManagerMotor_GetMotorDirection(uint8_t motorIndex);
void   ManagerMotor_MotorIncrement(uint8_t motorIndex, int8_t direction);

void ManagerMotor_Init()
{
    // InitCanBus
    PeriphCanbus_Init();
    PeriphMotors_Init(PeriphCanbus_TransmitDLC8);
    HAL_Delay(50);

    ManagerMotor_Reset();
}

void ManagerMotor_Reset()
{
    // Init motors
    PeriphMotors_InitMotor(&motors[MMOT_MOTOR_1].motor, MMOT_MOTOR_1_CAN_ID,
                           MOTOR_AK10_9);
    PeriphMotors_InitMotor(&motors[MMOT_MOTOR_2].motor, MMOT_MOTOR_2_CAN_ID,
                           MOTOR_AK10_9);
    PeriphMotors_InitMotor(&motors[MMOT_MOTOR_3].motor, MMOT_MOTOR_3_CAN_ID,
                           MOTOR_AK80_64);

    // Init motor control info
    for (uint8_t i = 0; i < MMOT_MOTOR_NBR; i++)
    {
        motors[i].nextPosition = 0.0;
        motors[i].goalPosition = 0.0;
        motors[i].detected     = false;
        motors[i].goalReady    = false;
    }

    // Set Kp Kd
    // AK 10-9
    motors[MMOT_MOTOR_1].kp = 100.0f;
    motors[MMOT_MOTOR_1].kd = 5.0f;
    motors[MMOT_MOTOR_2].kp = 100.0f;
    motors[MMOT_MOTOR_2].kd = 5.0f;
    // AK 80-64
    motors[MMOT_MOTOR_3].kp = 100.0f;
    motors[MMOT_MOTOR_3].kd = 5.0f;

    // Init Data for canBus messages
    for (uint8_t i = 0; i < 8; i++)
    {
        data[i] = 0;
    }

    // Init State machine
    managerMotor.reset        = false;
    managerMotor.securityPass = false;
    managerMotor.state        = MMOT_STATE_WAITING_SECURITY;
}

void ManagerMotor_Task()
{
    // State machine that Init, sets to zero, reads informations and sends
    // informations to the motors
    if (HAL_GetTick() - timerMs >= TIMER)
    {
        ManagerMotor_ReceiveFromMotors();
        switch (managerMotor.state)
        {
        case MMOT_STATE_WAITING_SECURITY:
            ManagerMotor_WaitingSecurity();
            break;

        case MMOT_STATE_START_MOTORS:
            ManagerMotor_StartMotors();
            break;

        case MMOT_STATE_SET_ORIGIN:
            ManagerMotor_SetOrigines();
            break;

        case MMOT_STATE_READY2MOVE:
            ManagerMotor_CalculateNextPositions();
            ManagerMotor_SendToMotors();
            break;

        case MMOT_STATE_ERROR:
            ManagerMotor_DisableMotors();
            break;
        }
        timerMs = HAL_GetTick();
    }
}

void ManagerMotor_DisableMotors()
{
    PeriphMotors_Disable(&motors[MMOT_MOTOR_1].motor);
    PeriphMotors_Disable(&motors[MMOT_MOTOR_2].motor);
    PeriphMotors_Disable(&motors[MMOT_MOTOR_3].motor);
}

void ManagerMotor_EnableMotors()
{
    PeriphMotors_Enable(&motors[MMOT_MOTOR_1].motor);
    PeriphMotors_Enable(&motors[MMOT_MOTOR_2].motor);
    PeriphMotors_Enable(&motors[MMOT_MOTOR_3].motor);
}

void ManagerMotor_ResetMotors()
{
    PeriphMotors_Move(&motors[MMOT_MOTOR_1].motor, 0, 0, 0, 0, 0);
    PeriphMotors_Move(&motors[MMOT_MOTOR_2].motor, 0, 0, 0, 0, 0);
    PeriphMotors_Move(&motors[MMOT_MOTOR_3].motor, 0, 0, 0, 0, 0);
}

void ManagerMotor_ReceiveFromMotors()
{
    if (PeriphCanbus_GetNodeMsg(motors[MMOT_MOTOR_1].motor.id, data) &&
        data[0] != '\0')
    {
        PeriphMotors_ParseMotorState(&motors[MMOT_MOTOR_1].motor, data);
        motors[MMOT_MOTOR_1].detected = true;
    }

    if (PeriphCanbus_GetNodeMsg(motors[MMOT_MOTOR_2].motor.id, data) &&
        data[0] != '\0')
    {
        PeriphMotors_ParseMotorState(&motors[MMOT_MOTOR_2].motor, data);
        motors[MMOT_MOTOR_2].detected = true;
    }

    if (PeriphCanbus_GetNodeMsg(motors[MMOT_MOTOR_3].motor.id, data) &&
        data[0] != '\0')
    {
        PeriphMotors_ParseMotorState(&motors[MMOT_MOTOR_3].motor, data);
        motors[MMOT_MOTOR_3].detected = true;
    }
}

void ManagerMotor_WaitingSecurity()
{
    if (managerMotor.securityPass)
    {
        managerMotor.state = MMOT_STATE_START_MOTORS;
    }
}

void ManagerMotor_StartMotors()
{
    ManagerMotor_ResetMotors();
    ManagerMotor_EnableMotors();
    ManagerMotor_ResetMotors();

    if (motors[MMOT_MOTOR_1].detected && motors[MMOT_MOTOR_2].detected &&
        motors[MMOT_MOTOR_3].detected)
    {
        managerMotor.state = MMOT_STATE_SET_ORIGIN;
        tryCount           = 0;
    }
    else if (tryCount < MAX_TRY)
    {
        tryCount += 1;
    }
    else
    {
        managerMotor.state     = MMOT_STATE_ERROR;
        managerMotor.errorCode = CAN_CONNECTION_MOTORS_ERROR;
    }
}

void ManagerMotor_SetOrigines()
{
    if (motors[MMOT_MOTOR_1].motor.position <= 0.001 &&
        motors[MMOT_MOTOR_1].motor.position >= -0.001 &&
        motors[MMOT_MOTOR_2].motor.position <= 0.001 &&
        motors[MMOT_MOTOR_2].motor.position >= -0.001 &&
        motors[MMOT_MOTOR_3].motor.position <= 0.001 &&
        motors[MMOT_MOTOR_3].motor.position >= -0.001)
    {
        managerMotor.state = MMOT_STATE_READY2MOVE;
        tryCount           = 0;
    }
    else if (tryCount < MAX_TRY)
    {
        PeriphMotors_SetZeroPosition(&motors[MMOT_MOTOR_1].motor);
        PeriphMotors_SetZeroPosition(&motors[MMOT_MOTOR_2].motor);
        PeriphMotors_SetZeroPosition(&motors[MMOT_MOTOR_3].motor);

        tryCount += 1;
    }
    else
    {
        managerMotor.state     = MMOT_STATE_ERROR;
        managerMotor.errorCode = SET_ORIGINES_MOTORS_ERROR;
    }
}

void ManagerMotor_SendToMotors()
{
    for (uint8_t i = 0; i < MMOT_MOTOR_NBR; i++)
    {
        PeriphMotors_Move(&motors[i].motor, motors[i].nextPosition, 0, 0,
                          motors[i].kp, motors[i].kd);
    }
}

void ManagerMotor_SetMotorGoal(uint8_t motorIndex, float goal)
{
    motors[motorIndex].goalPosition = goal;
}

Motor* ManagerMotor_GetMotorData(uint8_t motorIndex)
{
    return &motors[motorIndex].motor;
}

bool ManagerMotor_IsGoalStateReady(uint8_t motorIndex)
{
    return motors[motorIndex]
        .goalReady;  // motor is ready when it has reached it's command
}

void ManagerMotor_CalculateNextPositions()
{
    if (fabsf(motors[MMOT_MOTOR_1].motor.position -
              motors[MMOT_MOTOR_1].goalPosition) > POSITION_TOL &&
        motors[MMOT_MOTOR_1].goalReady)
    {
        ManagerMotor_MotorIncrement(
            MMOT_MOTOR_1, ManagerMotor_GetMotorDirection(MMOT_MOTOR_1));
    }
    else
    {
        motors[MMOT_MOTOR_1].goalReady    = false;  // Motor reached his goal
        motors[MMOT_MOTOR_1].goalPosition = motors[MMOT_MOTOR_1].motor.position;
    }

    if (fabsf(motors[MMOT_MOTOR_2].motor.position -
              motors[MMOT_MOTOR_2].goalPosition) > POSITION_TOL &&
        motors[MMOT_MOTOR_2].goalReady)
    {
        ManagerMotor_MotorIncrement(
            MMOT_MOTOR_2, ManagerMotor_GetMotorDirection(MMOT_MOTOR_2));
    }
    else
    {
        motors[MMOT_MOTOR_2].goalReady    = false;
        motors[MMOT_MOTOR_2].goalPosition = motors[MMOT_MOTOR_2].motor.position;
    }

    if (fabsf(motors[MMOT_MOTOR_3].motor.position -
              motors[MMOT_MOTOR_3].goalPosition) > POSITION_TOL &&
        motors[MMOT_MOTOR_3].goalReady)
    {
        ManagerMotor_MotorIncrement(
            MMOT_MOTOR_3, ManagerMotor_GetMotorDirection(MMOT_MOTOR_3));
    }
    else
    {
        motors[MMOT_MOTOR_3].goalReady    = false;
        motors[MMOT_MOTOR_3].goalPosition = motors[MMOT_MOTOR_3].motor.position;
    }
}

int8_t ManagerMotor_GetMotorDirection(uint8_t motorIndex)
{
    if (motors[motorIndex].goalPosition < motors[motorIndex].motor.position)
    {
        return -1;
    }
    else
    {
        return 1;
    }
}

void ManagerMotor_MotorIncrement(uint8_t motorIndex, int8_t direction)
{
    motors[motorIndex].nextPosition += direction * MOTOR_STEP;
}

bool ManagerMotor_IsReady2Move()
{
    if (managerMotor.state == MMOT_STATE_READY2MOVE)
    {
        return true;
    }
    return false;
}

void ManagerMotor_SetMotorGoalState(uint8_t motorIndex, bool readyState)
{
    motors[motorIndex].goalReady = readyState;
}

/*
 * Security commands
 */
bool ManagerMotor_IsWaitingSecurity()
{
    if (managerMotor.state == MMOT_STATE_WAITING_SECURITY)
    {
        return true;
    }
    return false;
}

void ManagerMotor_SecurityPassed()
{
    managerMotor.securityPass = true;
}

void ManagerMotor_SetError()
{
    managerMotor.state = MMOT_STATE_ERROR;
}

bool ManagerMotor_InError()
{
    if (managerMotor.state == MMOT_STATE_ERROR)
    {
        return true;
    }
    return false;
}

uint8_t ManagerMotor_GetState()
{
    return managerMotor.state;
}
